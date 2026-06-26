import { github } from "../utils/githubAPI";
import { getSettings, saveSettings } from "../utils/storage";
import { unescapeHtml } from "../shared/utils/encoding";
import { generateSubmissionUrl } from "../codeforces";
import type { Submission } from "../shared/types/codeforces";
import { createRetryEngine, runSync } from "../sync";
import type { SyncServices, SyncStorage } from "../sync";

chrome.alarms.get("codeforces-sync", (existing) => {
  if (!existing) {
    chrome.alarms.create("codeforces-sync", { periodInMinutes: 1 });
  }
});

const retry = createRetryEngine();

const storage: SyncStorage = {
  getSettings,
  saveSettings,
};

const services: SyncServices = {
  findCodeforcesTab: async () => {
    const tabs = await chrome.tabs.query({ url: "*://*.codeforces.com/*" });
    const cfTabId = tabs.length > 0 && tabs[0].id ? tabs[0].id : null;
    if (cfTabId !== null) {
      const readyTab = tabs.find((t) => t.status === "complete") ?? tabs[0];
      console.log(
        `CodeforcesSync: Using CF tab #${readyTab.id} ` +
          `(url: ${readyTab.url?.slice(0, 60)}…) for API fetch.`,
      );
    }
    return cfTabId;
  },
  fetchTier1: async (cfTabId, apiUrl) => {
    const result = await fetchCodeforcesSubmissionsTier1(cfTabId, apiUrl);
    if (result !== null) retry.recordSuccess();
    return result;
  },
  extractSource: (sub) => fetchSourceCode(sub),
  uploadFile: (username, repo, path, contentBase64, message) =>
    github.uploadFile(username, repo, path, contentBase64, message),
  notify: (event) => {
    chrome.runtime.sendMessage({ type: event }).catch(() => {});
  },
};

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "codeforces-sync") {
    console.log("CodeforcesSync: Running background sync interval…");
    runSync(services, storage, retry).catch((e) =>
      console.error("CodeforcesSync: Top-level sync exception:", e)
    );
  }
});

async function fetchSourceCode(sub: Submission): Promise<string | null> {
  const url = generateSubmissionUrl(sub);
  const submissionId = sub.id;

  console.log(
    `CodeforcesSync: [Extraction] Opening background tab for submission ${submissionId}`
  );

  let tab: chrome.tabs.Tab | null = null;

  try {
    tab = await chrome.tabs.create({ url, active: false });

    await new Promise<void>((resolve, reject) => {
      const tabId = tab!.id!;
      let listenerAttached = false;

      const timeout = setTimeout(() => {
        if (listenerAttached) {
          chrome.tabs.onUpdated.removeListener(onUpdated);
        }
        reject(new Error(`Tab load timeout (30s) for submission ${submissionId}`));
      }, 30_000);

      function onUpdated(updatedTabId: number, info: { status?: string }) {
        if (updatedTabId === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          listenerAttached = false;
          clearTimeout(timeout);
          resolve();
        }
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
      listenerAttached = true;
    });

    await new Promise((r) => setTimeout(r, 2000));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (): string | null => {
        const selectors = [
          "#program-source-text",
          ".program-source",
          "pre.prettyprint",
          ".source-code",
          "#sourceCode",
          "div.source-code pre",
        ];

        for (const selector of selectors) {
          const el = document.querySelector(selector) as HTMLElement | null;
          if (el && el.innerText && el.innerText.trim().length > 20) {
            console.log(`CodeforcesSync (Tab): Found via "${selector}"`);
            return el.innerText;
          }
        }

        const pres = Array.from(document.getElementsByTagName("pre"));
        if (pres.length > 0) {
          const largest = pres.reduce((a, b) =>
            (a.innerText?.length || 0) > (b.innerText?.length || 0) ? a : b
          );
          if (largest && largest.innerText && largest.innerText.trim().length > 100) {
            console.log("CodeforcesSync (Tab): Found via largest <pre>");
            return largest.innerText;
          }
        }

        return null;
      },
    });

    if (results?.[0]?.result) {
      console.log(
        `CodeforcesSync: [Extraction OK] Submission ${submissionId}`
      );
      return unescapeHtml(results[0].result as string);
    }

    console.error(
      `CodeforcesSync: [Extraction Failed] No source found for ${submissionId}`
    );
    return null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `CodeforcesSync: [Extraction Error] Submission ${submissionId}: ${msg}`
    );
    return null;
  } finally {
    if (tab?.id != null) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
}


interface FetchResult {
  ok: boolean;
  status: number;
  body: unknown;
  isHtml: boolean;
  error?: string;
}

/**
 * Tier 1: Fetches via Official API (Injected Tab)
 * Fail-fast on 502, 503, 429 status codes directly to Tier 2.
 */
async function fetchCodeforcesSubmissionsTier1(
  cfTabId: number,
  apiUrl: string
): Promise<Submission[] | null> {
  const maxAttempts = 2;
  let lastError = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptDelay = attempt > 1 ? 4000 : 0;
    if (attemptDelay > 0) {
      console.log(
        `CodeforcesSync: [API Tier 1] Retry ${attempt}/${maxAttempts} — waiting ${attemptDelay / 1000}s…`
      );
      await new Promise((r) => setTimeout(r, attemptDelay));
    }

    try {
      let tabStillExists = true;
      try {
        await chrome.tabs.get(cfTabId);
      } catch {
        tabStillExists = false;
      }

      if (!tabStillExists) {
        lastError = "CF tab closed during retry";
        console.warn(
          `CodeforcesSync: [API Tier 1] ${lastError}. Failing over to Tier 2.`
        );
        return null;
      }

      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: cfTabId },
        func: async (url: string) => {
          try {
            const res = await fetch(url, {
              method: "GET",
              credentials: "include",
              headers: {
                Accept: "application/json",
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            });

            const contentType = res.headers.get("content-type") ?? "";
            const isHtml = contentType.includes("text/html");

            if (!res.ok) {
              return { ok: false, status: res.status, body: null, isHtml };
            }

            if (isHtml) {
              return { ok: false, status: res.status, body: null, isHtml: true };
            }

            let body: unknown = null;
            try {
              body = await res.json();
            } catch {
              return {
                ok: false,
                status: res.status,
                body: null,
                isHtml: false,
                error: "JSON parse failed",
              };
            }

            return { ok: true, status: res.status, body, isHtml: false };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, status: 0, body: null, isHtml: false, error: msg };
          }
        },
        args: [apiUrl],
      });

      const raw = (injectionResult?.[0]?.result) as FetchResult | undefined;

      if (!raw) {
        lastError = "Script injection returned no result";
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`
        );
        continue;
      }

      if (raw.error && !raw.ok) {
        lastError = `Network error: ${raw.error}`;
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`
        );
        continue;
      }

      if (raw.isHtml) {
        lastError = `Cloudflare HTML challenge (HTTP ${raw.status})`;
        console.warn(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}. Failing over to Tier 2.`
        );
        return null;
      }

      if (!raw.ok) {
        if (raw.status === 429 || raw.status === 503 || raw.status === 502) {
          console.warn(
            `CodeforcesSync: [API Tier 1] Attempt ${attempt} — HTTP ${raw.status}. Fail-fast to Tier 2.`
          );
          return null;
        }
        lastError = `HTTP ${raw.status}`;
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`
        );
        continue;
      }

      const data = raw.body;

      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        lastError = "Response body is not a plain object";
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
          data
        );
        continue;
      }

      const cfResponse = data as Record<string, unknown>;

      if (cfResponse["status"] !== "OK") {
        const comment =
          typeof cfResponse["comment"] === "string"
            ? cfResponse["comment"]
            : "none";
        lastError = `CF API status="${cfResponse["status"]}" comment="${comment}"`;
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`
        );
        continue;
      }

      if (!Array.isArray(cfResponse["result"])) {
        lastError = "CF API result field is not an array";
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
          data
        );
        continue;
      }

      const resultArray = cfResponse["result"] as Submission[];
      console.log(
        `CodeforcesSync: [API Tier 1] Attempt ${attempt} — SUCCESS. ` +
          `Received ${resultArray.length} submission(s).`
      );
      return resultArray;
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(
        `CodeforcesSync: [API Tier 1] Attempt ${attempt} — Unexpected exception: ${lastError}`
      );
    }
  }

  console.warn(
    `CodeforcesSync: [API Tier 1] All ${maxAttempts} attempts failed. ` +
      `Last error: "${lastError}". Attempting Tier 2 (RSS).`
  );
  return null;
}
