import { getSettings, saveSettings, clearSettings } from "./storage";

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
}

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
    const resetAt = parseInt(resetHeader, 10) * 1000;
    const now = Date.now();
    const delay = Math.max(resetAt - now + 1000, 1000);
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

  /**
   * Reads the GitHub token from storage.
   * Throws if storage read fails.
   */
  async loadToken(): Promise<string | null> {
    try {
      const settings = await getSettings();
      return settings.githubToken || null;
    } catch (e) {
      console.error("CodeforcesSync: loadToken storage error:", e);
      throw e;
    }
  }

  /**
   * Persists token + username after successful auth.
   * Throws if storage write fails.
   */
  async saveToken(token: string, username: string): Promise<void> {
    try {
      await saveSettings({ githubToken: token, githubUsername: username });
    } catch (e) {
      console.error("CodeforcesSync: saveToken storage error:", e);
      throw e;
    }
  }

  /**
   * Clears all settings (logout).
   * Throws if storage clear fails.
   */
  async logout(): Promise<void> {
    try {
      await clearSettings();
    } catch (e) {
      console.error("CodeforcesSync: logout storage error:", e);
      throw e;
    }
  }

  /**
   * Authenticated fetch with exponential backoff for GitHub rate limits.
   *
   * Retry policy:
   *   • 401 Unauthorized  → auto-logout, dispatch TOKEN_EXPIRED, throw (no retry — invalid token)
   *   • 403 / 429 with x-ratelimit-remaining=0 → wait until reset, retry
   *   • 5xx server errors → retry with backoff up to `maxAttempts`
   *   • Other non-OK      → returned as-is (caller decides)
   *
   * Mandatory headers sent on every request:
   *   • X-GitHub-Api-Version: 2022-11-28 (stable API version)
   *   • Authorization: Bearer {token}
   *   • Accept: application/vnd.github+json
   *   • Content-Type: application/json
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

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(url, { ...options, headers });

        if (res.status === 401) {
          await this.logout();
          chrome.runtime.sendMessage({ type: "TOKEN_EXPIRED" }).catch(() => {});
          throw new Error(
            "UNAUTHORIZED — GitHub token is invalid or expired. Please re-enter your token."
          );
        }

        if (
          (res.status === 403 || res.status === 429) &&
          res.headers.get("x-ratelimit-remaining") === "0"
        ) {
          if (attempt < maxAttempts) {
            await waitForRateLimitReset(res);
            continue;
          }
          throw new Error(
            `RATE_LIMIT_EXCEEDED — GitHub API quota exhausted. ` +
              `All ${maxAttempts} attempts used.`
          );
        }

        if (res.status >= 500 && attempt < maxAttempts) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 30_000);
          console.warn(
            `CodeforcesSync: [GitHub] HTTP ${res.status} on attempt ${attempt}/${maxAttempts}. ` +
              `Retrying in ${backoffMs / 1000}s…`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        return res;
      } catch (e: unknown) {
        lastError = e;
        const msg =
          e instanceof Error ? e.message : typeof e === "string" ? e : String(e);

        if (
          msg.startsWith("UNAUTHORIZED") ||
          msg.startsWith("RATE_LIMIT_EXCEEDED") ||
          msg.startsWith("No GitHub token")
        ) {
          throw e;
        }

        if (attempt < maxAttempts) {
          const backoffMs = Math.min(3000 * attempt, 15_000);
          console.warn(
            `CodeforcesSync: [GitHub] Network error on attempt ${attempt}/${maxAttempts}: ` +
              `${msg}. Retrying in ${backoffMs / 1000}s…`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
      }
    }

    const lastMsg =
      lastError instanceof Error
        ? lastError.message
        : typeof lastError === "string"
          ? lastError
          : String(lastError);
    console.error(
      `CodeforcesSync: [GitHub] All ${maxAttempts} fetch attempts failed. Last error: ${lastMsg}`
    );
    throw lastError || new Error("Fetch failed with no error details");
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
        return null;
      }
      const data = (await res.json()) as Record<string, unknown>;
      const sha = data["sha"];
      return typeof sha === "string" ? sha : null;
    } catch (e) {
      console.error("CodeforcesSync: checkFileExists error:", e);
      throw e;
    }
  }

  /**
   * Creates or updates a file in the repo via the GitHub Contents API.
   * Returns true on success, false otherwise.
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

      const body: Record<string, unknown> = {
        message,
        content: contentBase64,
      };
      if (sha) {
        body["sha"] = sha;
      }

      const res = await this.fetchWithRateLimit(url, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (res.status === 200 || res.status === 201) return true;

      const errText = await res.text().catch(() => "(unreadable)");
      console.error(
        `CodeforcesSync: [GitHub] Upload error — HTTP ${res.status} for "${path}" | ${errText}`
      );
      return false;
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      console.error(`CodeforcesSync: [GitHub] Upload exception for "${path}": ${msg}`);
      return false;
    }
  }
}
