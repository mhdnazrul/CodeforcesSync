import { getSettings, saveSettings, clearSettings } from "./storage";

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
}

// ─── Exponential backoff helper ───────────────────────────────────────────────
/**
 * Waits for the duration indicated by the GitHub `x-ratelimit-reset` header
 * (epoch seconds), or falls back to `defaultDelayMs` if the header is absent.
 */
async function waitForRateLimitReset(
  res: Response,
  defaultDelayMs: number = 60_000
): Promise<void> {
  const resetHeader = res.headers.get("x-ratelimit-reset");
  if (resetHeader) {
    const resetAt = parseInt(resetHeader, 10) * 1000; // convert to ms
    const now = Date.now();
    const delay = Math.max(resetAt - now + 1000, 1000); // +1 s buffer
    console.warn(
      `CodeforcesSync: [GitHub] Rate limit hit. Waiting ${Math.round(delay / 1000)}s ` +
        `until reset at ${new Date(resetAt).toLocaleTimeString()}.`
    );
    await new Promise((r) => setTimeout(r, delay));
  } else {
    console.warn(
      `CodeforcesSync: [GitHub] Rate limit hit (no reset header). ` +
        `Waiting ${defaultDelayMs / 1000}s.`
    );
    await new Promise((r) => setTimeout(r, defaultDelayMs));
  }
}

export class GithubHandler {
  private readonly baseUrl = "https://api.github.com";

  /** Reads the GitHub token from storage. */
  async loadToken(): Promise<string | null> {
    const settings = await getSettings();
    return settings.githubToken || null;
  }

  /** Persists token + username after successful auth. */
  async saveToken(token: string, username: string): Promise<void> {
    await saveSettings({ githubToken: token, githubUsername: username });
  }

  /** Clears all settings (logout). */
  async logout(): Promise<void> {
    await clearSettings();
  }

  /**
   * Authenticated fetch with exponential backoff for GitHub rate limits.
   *
   * Retry policy:
   *   • 401 Unauthorized  → auto-logout, throw (no retry — invalid token)
   *   • 403 / 429 with x-ratelimit-remaining=0 → wait until reset, retry
   *   • 5xx server errors → retry with backoff up to `maxAttempts`
   *   • Other non-OK      → returned as-is (caller decides)
   *
   * @param url          GitHub API endpoint URL
   * @param options      fetch RequestInit (method, body, etc.)
   * @param maxAttempts  Maximum attempts before giving up (default 4)
   */
  async fetchWithRateLimit(
    url: string,
    options: RequestInit,
    maxAttempts: number = 4
  ): Promise<Response> {
    const token = await this.loadToken();
    if (!token) throw new Error("No GitHub token available");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(url, { ...options, headers });

        // ── 401 Unauthorized — invalid / expired token ────────────────────
        if (res.status === 401) {
          await this.logout();
          // Notify the popup so it can display a visible warning to the user.
          // The .catch() is intentional: the popup may not be open.
          chrome.runtime.sendMessage({ type: "TOKEN_EXPIRED" }).catch(() => {});
          throw new Error("UNAUTHORIZED — GitHub token is invalid or expired. Please re-enter your token.");
        }

        // ── Rate limited (403 + quota exhausted, or 429) ──────────────────
        if (
          (res.status === 403 || res.status === 429) &&
          res.headers.get("x-ratelimit-remaining") === "0"
        ) {
          if (attempt < maxAttempts) {
            await waitForRateLimitReset(res);
            continue; // retry after waiting
          }
          throw new Error(
            `RATE_LIMIT_EXCEEDED — GitHub API quota exhausted. ` +
              `All ${maxAttempts} attempts used.`
          );
        }

        // ── 5xx server errors — retry with backoff ────────────────────────
        if (res.status >= 500 && attempt < maxAttempts) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 30_000);
          console.warn(
            `CodeforcesSync: [GitHub] HTTP ${res.status} on attempt ${attempt}/${maxAttempts}. ` +
              `Retrying in ${backoffMs / 1000}s…`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        // ── All other responses (success or client errors) — return as-is ─
        return res;
      } catch (e: any) {
        // Re-throw non-retryable errors immediately
        if (
          e.message?.startsWith("UNAUTHORIZED") ||
          e.message?.startsWith("RATE_LIMIT_EXCEEDED") ||
          e.message?.startsWith("No GitHub token")
        ) {
          throw e;
        }

        // Network-level error — retry with backoff
        if (attempt < maxAttempts) {
          const backoffMs = Math.min(3000 * attempt, 15_000);
          console.warn(
            `CodeforcesSync: [GitHub] Network error on attempt ${attempt}/${maxAttempts}: ` +
              `${e.message}. Retrying in ${backoffMs / 1000}s…`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        // Final attempt also failed
        console.error(
          `CodeforcesSync: [GitHub] All ${maxAttempts} fetch attempts failed. Last error: ${e.message}`
        );
        throw e;
      }
    }

    // Should never reach here, but satisfies TypeScript
    throw new Error(
      `CodeforcesSync: [GitHub] fetchWithRateLimit exhausted all attempts for ${url}`
    );
  }

  /**
   * Returns the current SHA of a file in the repo, or null if it doesn't exist.
   * Required by the GitHub Contents API when updating an existing file.
   */
  async checkFileExists(
    username: string,
    repo: string,
    path: string
  ): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/repos/${username}/${repo}/contents/${path}`;
      const res = await this.fetchWithRateLimit(url, { method: "GET" });
      if (res.status === 404) return null;
      if (!res.ok) {
        console.error(
          `CodeforcesSync: [GitHub] checkFileExists HTTP ${res.status} for "${path}"`
        );
        return null; // treat unknown errors as "file not found" to attempt a create
      }
      const data = await res.json();
      return data.sha ?? null;
    } catch (e) {
      console.error("CodeforcesSync: checkFileExists error:", e);
      throw e;
    }
  }

  /**
   * Creates or updates a file in the repo via the GitHub Contents API.
   * Returns true on success.
   */
  async uploadFile(
    username: string,
    repo: string,
    path: string,
    contentBase64: string,
    message: string
  ): Promise<boolean> {
    try {
      const sha = await this.checkFileExists(username, repo, path);
      const url = `${this.baseUrl}/repos/${username}/${repo}/contents/${path}`;

      const res = await this.fetchWithRateLimit(url, {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: contentBase64,
          ...(sha ? { sha } : {}),
        }),
      });

      if (res.status === 200 || res.status === 201) return true;

      const errText = await res.text().catch(() => "(unreadable)");
      console.error(
        `CodeforcesSync: [GitHub] Upload error — HTTP ${res.status} for "${path}" | ${errText}`
      );
      return false;
    } catch (e: any) {
      console.error(
        `CodeforcesSync: [GitHub] Upload exception for "${path}":`,
        e?.message || e
      );
      return false;
    }
  }
}
