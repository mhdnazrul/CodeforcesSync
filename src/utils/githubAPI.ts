import { getSettings, saveSettings, clearSettings } from "./storage";

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
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
   * Authenticated fetch with basic rate-limit handling.
   * Throws on 401 (and auto-logs out) or 403/429 with no remaining quota.
   */
  async fetchWithRateLimit(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const token = await this.loadToken();
    if (!token) throw new Error("No GitHub token available");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      await this.logout();
      throw new Error("UNAUTHORIZED");
    }

    if ((res.status === 403 || res.status === 429) &&
        res.headers.get("x-ratelimit-remaining") === "0") {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    return res;
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

      const errText = await res.text();
      console.error(
        `CodeforcesSync: GitHub upload error — HTTP ${res.status} | ${errText}`
      );
      return false;
    } catch (e) {
      console.error("CodeforcesSync: GitHub upload exception:", e);
      return false;
    }
  }
}
