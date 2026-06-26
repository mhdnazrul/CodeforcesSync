export interface GithubCredentialStore {
  getToken(): Promise<string | null>;
  saveToken(token: string, username: string): Promise<void>;
  clear(): Promise<void>;
}

async function waitForRateLimitReset(
  res: Response,
  defaultDelayMs: number = 60_000,
): Promise<void> {
  const resetHeader = res.headers.get("x-ratelimit-reset");
  if (resetHeader) {
    const resetAt = parseInt(resetHeader, 10) * 1000;
    const now = Date.now();
    const delay = Math.max(resetAt - now + 1000, 1000);
    console.warn(
      `CodeforcesSync: [GitHub] Rate limit hit. Waiting ${Math.round(delay / 1000)}s ` +
        `until reset at ${new Date(resetAt).toLocaleTimeString()}.`,
    );
    await new Promise((r) => setTimeout(r, delay));
  } else {
    console.warn(
      `CodeforcesSync: [GitHub] Rate limit hit (no reset header). ` +
        `Waiting ${defaultDelayMs / 1000}s.`,
    );
    await new Promise((r) => setTimeout(r, defaultDelayMs));
  }
}

export class GithubHandler {
  private readonly baseUrl = "https://api.github.com";

  private readonly credentialStore: GithubCredentialStore;
  private readonly onTokenExpired?: () => void;

  constructor(
    credentialStore: GithubCredentialStore,
    onTokenExpired?: () => void,
  ) {
    this.credentialStore = credentialStore;
    this.onTokenExpired = onTokenExpired;
  }

  async fetchWithRateLimit(
    url: string,
    options: RequestInit,
    maxAttempts: number = 4,
  ): Promise<Response> {
    const token = await this.credentialStore.getToken();
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
          await this.credentialStore.clear();
          this.onTokenExpired?.();
          throw new Error(
            "UNAUTHORIZED — GitHub token is invalid or expired. Please re-enter your token.",
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
              `All ${maxAttempts} attempts used.`,
          );
        }

        if (res.status >= 500 && attempt < maxAttempts) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 30_000);
          console.warn(
            `CodeforcesSync: [GitHub] HTTP ${res.status} on attempt ${attempt}/${maxAttempts}. ` +
              `Retrying in ${backoffMs / 1000}s…`,
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
              `${msg}. Retrying in ${backoffMs / 1000}s…`,
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
      `CodeforcesSync: [GitHub] All ${maxAttempts} fetch attempts failed. Last error: ${lastMsg}`,
    );
    throw lastError || new Error("Fetch failed with no error details");
  }

  async checkFileExists(
    username: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/repos/${username}/${repo}/contents/${path}`;
      const res = await this.fetchWithRateLimit(url, { method: "GET" });
      if (res.status === 404) return null;
      if (!res.ok) {
        console.error(
          `CodeforcesSync: [GitHub] checkFileExists HTTP ${res.status} for "${path}"`,
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

  async uploadFile(
    username: string,
    repo: string,
    path: string,
    contentBase64: string,
    message: string,
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
        `CodeforcesSync: [GitHub] Upload error — HTTP ${res.status} for "${path}" | ${errText}`,
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
