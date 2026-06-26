import { ChromeStorageService, ChromeTabsService, ChromeScriptingService, ChromeRuntimeService, ChromeAlarmsService } from "../browser/chrome/adapter";
import { createStore } from "../storage";
import { createRetryEngine } from "../sync";
import { GithubHandler } from "../github";
import type { GithubCredentialStore } from "../github";
import type { SyncStorage } from "../sync";
import { startScheduler } from "./scheduler";
import { runSyncWorker } from "./syncWorker";

const store = createStore(new ChromeStorageService());

const credentialStore: GithubCredentialStore = {
  getToken: async () => {
    const s = await store.getSettings();
    return s.githubToken || null;
  },
  saveToken: async (token, username) => {
    await store.saveSettings({ githubToken: token, githubUsername: username });
  },
  clear: async () => {
    await store.saveSettings({ githubToken: "", githubUsername: "" });
  },
};

const runtime = new ChromeRuntimeService();
const github = new GithubHandler(credentialStore, () => {
  runtime.sendMessage({ type: "TOKEN_EXPIRED" }).catch(() => {});
});

const alarms = new ChromeAlarmsService();
const tabs = new ChromeTabsService();
const scripting = new ChromeScriptingService();

const retry = createRetryEngine();
const storage: SyncStorage = { getSettings: store.getSettings, saveSettings: store.saveSettings };

startScheduler(alarms, () => {
  runSyncWorker(
    tabs,
    scripting,
    runtime,
    (username, repo, path, contentBase64, message) =>
      github.uploadFile(username, repo, path, contentBase64, message),
    storage,
    retry,
  ).catch((e) =>
    console.error("CodeforcesSync: Top-level sync exception:", e)
  );
});

// ── OAuth ────────────────────────────────────────────────────────────────────

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomHex(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleOAuthFlow(): Promise<void> {
  console.log("CodeforcesSync: [OAuth] Entering handleOAuthFlow");
  console.log("CodeforcesSync: [OAuth] chrome.identity available:", typeof chrome.identity !== "undefined");
  console.log("CodeforcesSync: [OAuth] chrome.identity.getRedirectURL available:", typeof chrome.identity?.getRedirectURL === "function");

  console.log("CodeforcesSync: [OAuth] Generating PKCE code verifier...");
  const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  console.log("CodeforcesSync: [OAuth] codeVerifier length:", codeVerifier.length);

  console.log("CodeforcesSync: [OAuth] Computing SHA-256 digest...");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64url(new Uint8Array(digest));
  console.log("CodeforcesSync: [OAuth] codeChallenge generated:", codeChallenge.slice(0, 16) + "...");

  console.log("CodeforcesSync: [OAuth] Generating random state...");
  const state = randomHex(16);
  console.log("CodeforcesSync: [OAuth] state:", state);

  console.log("CodeforcesSync: [OAuth] Storing oauthVerifier and oauthState in chrome.storage.session...");
  await chrome.storage.session.set({ oauthVerifier: codeVerifier, oauthState: state });
  console.log("CodeforcesSync: [OAuth] session storage written successfully");

  console.log("CodeforcesSync: [OAuth] Reading VITE_OAUTH_BROKER_URL env var...");
  const brokerUrl = import.meta.env.VITE_OAUTH_BROKER_URL as string | undefined;
  console.log("CodeforcesSync: [OAuth] VITE_OAUTH_BROKER_URL =", brokerUrl ?? "(undefined)");
  if (!brokerUrl) throw new Error("VITE_OAUTH_BROKER_URL is not configured");

  console.log("CodeforcesSync: [OAuth] Calling chrome.identity.getRedirectURL...");
  const redirectUri = chrome.identity.getRedirectURL("oauth-callback");
  console.log("CodeforcesSync: [OAuth] redirectUri:", redirectUri);

  const authUrl =
    `${brokerUrl}/api/oauth/authorize` +
    `?redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256` +
    `&code_verifier=${encodeURIComponent(codeVerifier)}`;

  console.log("CodeforcesSync: [OAuth] Constructed authUrl:", authUrl.slice(0, 120) + "...");
  console.log("CodeforcesSync: [OAuth] Calling chrome.identity.launchWebAuthFlow...");

  const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
  console.log("CodeforcesSync: [OAuth] launchWebAuthFlow returned:", responseUrl ? "URL (" + responseUrl.length + " chars)" : "null/undefined");
  if (!responseUrl) throw new Error("OAuth flow returned no response URL");

  console.log("CodeforcesSync: [OAuth] Parsing response URL params...");
  const params = new URL(responseUrl).searchParams;

  const oauthError = params.get("error");
  console.log("CodeforcesSync: [OAuth] oauthError param:", oauthError ?? "(none)");
  if (oauthError) throw new Error(`GitHub OAuth error: ${oauthError}`);

  const returnedToken = params.get("token");
  const returnedState = params.get("state");
  const username = params.get("username") || "unknown";
  console.log("CodeforcesSync: [OAuth] token present:", !!returnedToken, "| state:", returnedState, "| username:", username);

  if (!returnedToken) throw new Error("No access token returned from OAuth broker");

  console.log("CodeforcesSync: [OAuth] Verifying CSRF state...");
  const stored = await chrome.storage.session.get(["oauthState"]);
  console.log("CodeforcesSync: [OAuth] stored.oauthState:", stored.oauthState, "| returnedState:", returnedState);
  if (returnedState !== stored.oauthState) throw new Error("OAuth state mismatch — possible CSRF");

  console.log("CodeforcesSync: [OAuth] Saving token to credentialStore...");
  await credentialStore.saveToken(returnedToken, username);

  console.log("CodeforcesSync: [OAuth] Cleaning up session storage...");
  await chrome.storage.session.remove(["oauthVerifier", "oauthState"]);

  console.log("CodeforcesSync: [OAuth] Broadcasting OAUTH_COMPLETE...");
  chrome.runtime.sendMessage({ type: "OAUTH_COMPLETE", success: true }).catch(() => {});
  console.log("CodeforcesSync: [OAuth] handleOAuthFlow completed successfully");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "OAUTH_START") {
    console.log("CodeforcesSync: [OAuth] OAUTH_START message received");
    handleOAuthFlow()
      .then(() => {
        console.log("CodeforcesSync: [OAuth] handleOAuthFlow succeeded, sending success response");
        sendResponse({ success: true });
      })
      .catch((err: Error) => {
        console.error("CodeforcesSync: [OAuth] handleOAuthFlow threw:", err.message, err);
        console.error("CodeforcesSync: [OAuth] Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
        sendResponse({ error: err.message });
      });
    return true;
  }
  if (message.type === "OAUTH_STATUS") {
    store.getSettings().then((s) => {
      sendResponse({ connected: !!s.githubToken, githubUsername: s.githubUsername });
    });
    return true;
  }
  if (message.type === "VALIDATE_REPO") {
    const repoName = message.repo as string;
    validateRepo(repoName, credentialStore)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ valid: false, error: err.message }));
    return true;
  }
});

async function validateRepo(
  repo: string,
  creds: GithubCredentialStore
): Promise<{ valid: boolean; error?: string }> {
  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, error: "Invalid repository format. Use owner/repo." };
  }
  const [owner, repoName] = parts;

  const token = await creds.getToken();
  if (!token) {
    return { valid: false, error: "Not authenticated with GitHub. Please re-authenticate." };
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (response.status === 200) {
    const data = await response.json();
    if (data.permissions && !data.permissions.push) {
      return { valid: false, error: "You don't have write access to this repository." };
    }
    return { valid: true };
  }
  if (response.status === 404) {
    return { valid: false, error: "Repository not found." };
  }
  if (response.status === 403) {
    return { valid: false, error: "Access denied to this repository." };
  }
  return { valid: false, error: `GitHub API error (${response.status}). Please try again.` };
}
