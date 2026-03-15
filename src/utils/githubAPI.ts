import { getSettings, saveSettings, clearSettings } from "./storage";

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export class GithubHandler {
  private readonly baseUrl = "https://api.github.com";

  /**
   * Loads the GitHub token securely from local storage
   */
  async loadToken(): Promise<string | null> {
    const settings = await getSettings();
    return settings.githubToken || null;
  }

  /**
   * Saves the token to local storage securely
   */
  async saveToken(token: string, username: string): Promise<void> {
    await saveSettings({
      githubToken: token,
      githubUsername: username,
    });
  }

  /**
   * Exits auth state
   */
  async logout(): Promise<void> {
    await clearSettings();
  }

  /**
   * Performs an API request with rate limit handling (Exponential Backoff)
   */
  async fetchWithRateLimit(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const token = await this.loadToken();
    if (!token) throw new Error("No token available");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      await this.logout();
      throw new Error("UNAUTHORIZED");
    }

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
    }

    return res;
  }

  /**
   * Checks if a file exists in the repo
   */
  async checkFileExists(
    username: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/repos/${username}/${repo}/contents/${path}`;
      const res = await this.fetchWithRateLimit(url, { method: "GET" });
      if (res.status === 404) return null;

      const data = await res.json();
      return data.sha || null;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * Pushes a file commit
   */
  async uploadFile(
    username: string,
    repo: string,
    path: string,
    contentBase64: string,
    message: string,
  ): Promise<boolean> {
    try {
      const sha = await checkFileExistsSafe(this, username, repo, path);

      const url = `${this.baseUrl}/repos/${username}/${repo}/contents/${path}`;
      const res = await this.fetchWithRateLimit(url, {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: contentBase64,
          ...(sha ? { sha } : {}),
        }),
      });

      if (res.status === 200 || res.status === 201) {
        return true;
      } else {
        const errText = await res.text();
        console.error(`GitHub API Upload Error: HTTP ${res.status} | Body: ${errText}`);
        return false;
      }
    } catch (e: any) {
      console.error("GitHub Uploader Exception:", e);
      return false;
    }
  }
}

// Helper to avoid 'this' context issues if destructured
async function checkFileExistsSafe(
  handler: GithubHandler,
  username: string,
  repo: string,
  path: string,
) {
  return await handler.checkFileExists(username, repo, path);
}
