import { GithubHandler } from "../utils/githubAPI";
import { getSettings, saveSettings } from "../utils/storage";
import { generateFilePath } from "../utils/formatters";
import { computeStreak } from "../statistics";
import { toLocalDateString } from "../shared/utils/date";
import { unescapeHtml, utf8ToBase64 } from "../shared/utils/encoding";
import {
  generateSubmissionUrl,
  fetchRssFeed,
  isAcceptedSubmission,
  getProblemId,
  createApiUrl,
} from "../codeforces";
import type { Submission } from "../shared/types/codeforces";

const github = new GithubHandler();

let isSyncing = false;

interface RetryState {
  consecutiveFailures: number;
  lastFailureTime: number;
  lastFailureReason: string;
  backoffUntil: number;
}

const retryState: RetryState = {
  consecutiveFailures: 0,
  lastFailureTime: 0,
  lastFailureReason: "",
  backoffUntil: 0,
};

const MAX_CONSECUTIVE_FAILURES = 8;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 960_000;

chrome.alarms.get("codeforces-sync", (existing) => {
  if (!existing) {
    chrome.alarms.create("codeforces-sync", { periodInMinutes: 1 });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "codeforces-sync") {
    console.log("CodeforcesSync: Running background sync interval…");
    syncSolutions().catch((e) =>
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

async function updateStreak(): Promise<void> {
  try {
    const settings = await getSettings();
    const result = computeStreak(
      settings.currentStreak,
      settings.lastAcceptedDate,
      settings.solvedDays,
    );
    await saveSettings({
      currentStreak: result.newStreak,
      lastAcceptedDate: result.newLastAcceptedDate,
      solvedDays: result.updatedSolvedDays,
    });
    console.log(`CodeforcesSync: Streak updated → ${result.newStreak}`);
  } catch (e) {
    console.error("CodeforcesSync: Streak update error", e);
  }
}

function recordApiFailure(reason: string): number {
  retryState.consecutiveFailures = Math.min(
    retryState.consecutiveFailures + 1,
    MAX_CONSECUTIVE_FAILURES
  );
  retryState.lastFailureTime = Date.now();
  retryState.lastFailureReason = reason;

  const delayMs = Math.min(
    BACKOFF_BASE_MS * Math.pow(2, retryState.consecutiveFailures - 1),
    BACKOFF_CAP_MS
  );
  retryState.backoffUntil = Date.now() + delayMs;

  console.warn(
    `CodeforcesSync: [Backoff] Failure #${retryState.consecutiveFailures} — ` +
      `reason: "${reason}". ` +
      `Next retry allowed in ${Math.round(delayMs / 1000)}s ` +
      `(at ${new Date(retryState.backoffUntil).toLocaleTimeString()}).`
  );

  return delayMs;
}

function recordApiSuccess(): void {
  if (retryState.consecutiveFailures > 0) {
    console.log(
      `CodeforcesSync: [Backoff] API recovered after ${retryState.consecutiveFailures} failure(s). Resetting backoff.`
    );
  }
  retryState.consecutiveFailures = 0;
  retryState.lastFailureTime = 0;
  retryState.lastFailureReason = "";
  retryState.backoffUntil = 0;
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
      recordApiSuccess();
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

/**
 * Dual-Tier Fetching:
 *   Tier 1 (API via Injected Tab) → Tier 2 (RSS/Atom Feed)
 *
 * If Tier 1 succeeds, use its result.
 * If Tier 1 fails or no CF tab is open, attempt Tier 2.
 * Only activate exponential backoff if BOTH tiers fail.
 */
async function fetchCodeforcesSubmissionsDualTier(
  cfTabId: number | null,
  handle: string,
  apiUrl: string
): Promise<Submission[] | null> {
  if (cfTabId !== null) {
    console.log("CodeforcesSync: [Dual Tier] Attempting Tier 1 (Official API)…");
    const tier1Result = await fetchCodeforcesSubmissionsTier1(
      cfTabId,
      apiUrl
    );
    if (tier1Result !== null) {
      return tier1Result;
    }
  } else {
    console.log(
      "CodeforcesSync: [Dual Tier] No CF tab open. Skipping Tier 1, attempting Tier 2 (RSS).…"
    );
  }

  console.log("CodeforcesSync: [Dual Tier] Attempting Tier 2 (RSS Feed)…");
  const tier2Result = await fetchRssFeed(handle);
  if (tier2Result !== null) {
    recordApiSuccess();
    return tier2Result;
  }

  console.error(
    "CodeforcesSync: [Dual Tier] Both Tier 1 (API) and Tier 2 (RSS) failed. " +
      "Activating exponential backoff."
  );
  recordApiFailure("Dual-tier fetch: both API and RSS failed");
  return null;
}

async function syncSolutions(): Promise<void> {
  if (isSyncing) {
    console.log("CodeforcesSync: Sync already in progress, skipping.");
    return;
  }

  if (retryState.backoffUntil > Date.now()) {
    const waitSec = Math.round(
      (retryState.backoffUntil - Date.now()) / 1000
    );
    console.log(
      `CodeforcesSync: [Backoff] In cooldown — ${waitSec}s remaining ` +
        `(last failure: "${retryState.lastFailureReason}"). Skipping this tick.`
    );
    return;
  }

  isSyncing = true;

  try {
    const settings = await getSettings();
    const now = new Date();
    const todayStr = toLocalDateString(now);

    const lastAccepted = settings.lastAcceptedDate;
    if (lastAccepted) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = toLocalDateString(yesterday);

      if (lastAccepted !== todayStr && lastAccepted !== yesterdayStr) {
        if (settings.currentStreak !== 0) {
          console.log("CodeforcesSync: Streak broken — resetting to 0");
          await saveSettings({ currentStreak: 0 });
          chrome.runtime.sendMessage({ type: "SYNC_SUCCESS" }).catch(() => {});
        }
      }
    }

    if (
      !settings.githubToken ||
      !settings.githubRepo ||
      !settings.githubUsername ||
      !settings.codeforcesHandle
    ) {
      console.log(
        "CodeforcesSync: Sync aborted — missing GitHub credentials or Codeforces handle."
      );
      return;
    }

    const tabs = await chrome.tabs.query({ url: "*://*.codeforces.com/*" });
    const cfTabId = tabs.length > 0 && tabs[0].id ? tabs[0].id : null;

    if (cfTabId !== null) {
      const readyTab = tabs.find((t) => t.status === "complete") ?? tabs[0];
      console.log(
        `CodeforcesSync: Using CF tab #${readyTab.id} ` +
          `(url: ${readyTab.url?.slice(0, 60)}…) for API fetch.`
      );
    } else {
      console.log(
        "CodeforcesSync: No Codeforces tab open. Will attempt RSS feed fallback."
      );
    }

    const apiUrl = createApiUrl(settings.codeforcesHandle.trim());

    const submissions = await fetchCodeforcesSubmissionsDualTier(
      cfTabId,
      settings.codeforcesHandle.trim(),
      apiUrl
    );

    if (!submissions) {
      return;
    }

    const acceptedSubmissions = submissions.filter(isAcceptedSubmission);

    if (acceptedSubmissions.length === 0) {
      console.log("CodeforcesSync: No accepted submissions in latest batch.");
      return;
    }

    const synced = [...(settings.syncedSubmissions || [])];

    for (const sub of [...acceptedSubmissions].reverse()) {
      const submissionId = sub.id.toString();

      if (synced.includes(submissionId)) continue;

      if (
        !sub.problem?.index ||
        !sub.problem?.name ||
        !sub.programmingLanguage
      ) {
        console.error(
          `CodeforcesSync: Submission ${submissionId} has malformed problem data — skipping.`,
          sub
        );
        continue;
      }

      const problemId = getProblemId(sub);
      const problemName = sub.problem.name;
      const language = sub.programmingLanguage;

      console.log(
        `CodeforcesSync: Processing new submission ${submissionId} — ${problemId} (${language})`
      );

      const code = await fetchSourceCode(sub);
      if (!code) {
        console.error(
          `CodeforcesSync: Source extraction failed for ${submissionId}. Will retry next cycle.`
        );
        continue;
      }

      const path = generateFilePath(
        problemId,
        problemName,
        language,
        settings.useSubdirectory,
        settings.subdirectoryName
      );

      const commitMsg = `Sync Codeforces: ${problemId} - ${problemName} [${language}]`;
      const contentBase64 = utf8ToBase64(code);

      console.log(
        `CodeforcesSync: Uploading ${path} → ${settings.githubUsername}/${settings.githubRepo}`
      );

      const success = await github.uploadFile(
        settings.githubUsername,
        settings.githubRepo,
        path,
        contentBase64,
        commitMsg
      );

      if (success) {
        console.log(`CodeforcesSync: ✅ Synced ${submissionId} to GitHub`);
        synced.push(submissionId);
        await saveSettings({ syncedSubmissions: synced });
        await updateStreak();
        chrome.runtime.sendMessage({ type: "SYNC_SUCCESS" }).catch(() => {});
      } else {
        console.error(
          `CodeforcesSync: ❌ GitHub push failed for ${submissionId} — will retry next cycle.`
        );
      }

      await new Promise((r) => setTimeout(r, 2500));
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("CodeforcesSync: Unexpected error in sync loop:", msg);
    recordApiFailure(`Unexpected error: ${msg}`);
  } finally {
    isSyncing = false;
  }
}
