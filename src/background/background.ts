import { GithubHandler } from "../utils/githubAPI";
import { getSettings, saveSettings } from "../utils/storage";
import { generateFilePath } from "../utils/formatters";

const github = new GithubHandler();

// ─── Concurrency guard ────────────────────────────────────────────────────────
// Prevents overlapping sync runs if the Service Worker alarm fires while a
// previous sync is still in progress (each submission takes several seconds).
let isSyncing = false;

// ─── Retry state tracker ──────────────────────────────────────────────────────
// Tracks consecutive API failures so we can apply exponential backoff and
// avoid hammering a rate-limited / Cloudflare-protected endpoint.
//
// NOTE: This object lives in module-level memory.  A Chrome MV3 Service Worker
// can be terminated between alarm firings (it is NOT a long-lived process).
// When it restarts the counters reset to zero, which is the correct behaviour:
// a fresh SW restart is already a natural "pause", so resetting backoff on
// restart is safe and prevents stale counters persisting across browser sessions.
interface RetryState {
  consecutiveFailures: number;
  lastFailureTime: number;
  lastFailureReason: string;
  backoffUntil: number;
}

let retryState: RetryState = {
  consecutiveFailures: 0,
  lastFailureTime: 0,
  lastFailureReason: "",
  backoffUntil: 0,
};

// Maximum number of consecutive failures before the backoff ceiling is reached.
const MAX_CONSECUTIVE_FAILURES = 8;
// Base delay in ms for exponential backoff (doubles with each failure).
const BACKOFF_BASE_MS = 30_000; // 30 s
// Ceiling: never wait more than ~16 minutes between retries.
const BACKOFF_CAP_MS = 960_000;

// ─── Alarm setup ─────────────────────────────────────────────────────────────
// Check before creating to avoid duplicate alarms on Service Worker restarts.
chrome.alarms.get("codeforces-sync", (existing) => {
  if (!existing) {
    chrome.alarms.create("codeforces-sync", { periodInMinutes: 1 });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "codeforces-sync") {
    console.log("CodeforcesSync: Running background sync interval…");
    // Floating-promise is intentional here: the alarm listener must be
    // synchronous. syncSolutions() is self-guarded by isSyncing and its own
    // top-level try/catch, so an unhandled rejection is impossible.
    syncSolutions().catch((e) =>
      console.error("CodeforcesSync: Top-level sync exception:", e)
    );
  }
});

// ─── HTML entity decoder ──────────────────────────────────────────────────────
function unescapeHtml(safe: string): string {
  return safe
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ─── URL builder ──────────────────────────────────────────────────────────────
/**
 * Builds the canonical Codeforces submission URL.
 *
 * contestId ranges:
 *   >= 100000 → Gym contest
 *   1 – 99999 → Standard contest / Problemset
 *   absent    → Problemset-only submission (no contestId field)
 */
function generateSubmissionUrl(sub: Submission): string {
  const { id: submissionId, contestId } = sub;

  if (typeof contestId === "number" && contestId >= 100_000) {
    console.log(
      `CodeforcesSync: Gym submission ${submissionId} (contest ${contestId})`
    );
    return `https://codeforces.com/gym/${contestId}/submission/${submissionId}`;
  }

  console.log(
    `CodeforcesSync: Contest submission ${submissionId} (contest ${contestId ?? "n/a"})`
  );
  return `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
}

// ─── Minimal typed interfaces for CF API objects ──────────────────────────────
// Using `any` everywhere makes null-access bugs invisible to TypeScript.
// These lightweight interfaces give the compiler enough to catch common mistakes.
interface CfProblem {
  index: string;
  name: string;
}

interface Submission {
  id: number;
  contestId?: number;
  verdict: string;
  programmingLanguage: string;
  problem: CfProblem;
}

// ─── Source code extractor ────────────────────────────────────────────────────
/**
 * Opens a BACKGROUND (hidden) tab to scrape the submission source code.
 *
 * Tab lifecycle guarantee
 * ───────────────────────
 * The tab reference is captured before `await` so it is always visible to the
 * `finally` block.  The `finally` block runs unconditionally — whether the body
 * succeeds, throws, or times out — so the tab is ALWAYS closed.
 *
 * The `onUpdated` listener is removed in BOTH the resolve and reject paths of
 * the inner Promise, preventing a listener leak if the timeout fires first.
 */
async function fetchSourceCode(sub: Submission): Promise<string | null> {
  const url = generateSubmissionUrl(sub);
  const submissionId = sub.id;

  console.log(
    `CodeforcesSync: [Extraction] Opening background tab for submission ${submissionId}`
  );

  // Declare tab BEFORE any await so `finally` can always reference it.
  let tab: chrome.tabs.Tab | null = null;

  try {
    // active: false — silent background tab, never steals focus
    tab = await chrome.tabs.create({ url, active: false });

    // Wait for the tab to reach "complete" status (max 30 s).
    // CRITICAL: both resolve and reject paths remove the listener to prevent leaks.
    await new Promise<void>((resolve, reject) => {
      const tabId = tab!.id!;

      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated); // ← always removed
        reject(new Error(`Tab load timeout (30s) for submission ${submissionId}`));
      }, 30_000);

      function onUpdated(updatedTabId: number, info: { status?: string }) {
        if (updatedTabId === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated); // ← always removed
          clearTimeout(timeout);
          resolve();
        }
      }

      chrome.tabs.onUpdated.addListener(onUpdated);
    });

    // Brief stabilization delay for dynamic syntax highlighters
    await new Promise((r) => setTimeout(r, 2000));

    // Inject extraction script with retry loop
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (): string | null => {
        // NOTE: This function runs in the page context (not the SW).
        // It is synchronous because executeScript already waits for the page to
        // reach "complete" before injection.  The inner polling loop is the
        // correct pattern for content that may still be rendering.
        const selectors = [
          "#program-source-text",
          ".program-source",
          "pre.prettyprint",
          ".source-code",
          "#sourceCode",
          "div.source-code pre",
        ];

        // Try selectors immediately — page is already "complete" at this point
        for (const selector of selectors) {
          const el = document.querySelector(selector) as HTMLElement | null;
          if (el && el.innerText.trim().length > 20) {
            console.log(`CodeforcesSync (Tab): Found via "${selector}"`);
            return el.innerText;
          }
        }

        // Fallback: largest <pre> element
        const pres = Array.from(document.getElementsByTagName("pre"));
        if (pres.length > 0) {
          const largest = pres.reduce((a, b) =>
            a.innerText.length > b.innerText.length ? a : b
          );
          if (largest.innerText.trim().length > 100) {
            console.log("CodeforcesSync (Tab): Found via largest <pre>");
            return largest.innerText;
          }
        }

        return null;
      },
    });

    // The injected func is now synchronous; we removed the inner async polling
    // loop because the 2-second stabilisation delay above already handles
    // syntax-highlighter rendering. If this fails we simply retry next cycle.
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
    // ✅ GUARANTEED tab cleanup — runs even if the catch re-throws or the
    // timeout rejects, because `finally` always executes regardless.
    if (tab?.id != null) {
      chrome.tabs.remove(tab.id).catch(() => {
        // Tab may already be gone (user closed it). Silently ignore.
      });
    }
  }
}

// ─── UTF-8 → Base64 ───────────────────────────────────────────────────────────
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Streak updater ───────────────────────────────────────────────────────────
async function updateStreak(): Promise<void> {
  try {
    const settings = await getSettings();
    const now = new Date();
    const todayStr = toLocalDateString(now);

    const solvedDays = [...(settings.solvedDays || [])];
    if (!solvedDays.includes(todayStr)) {
      solvedDays.push(todayStr);
    }

    // Prune entries older than 30 days to keep storage clean
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const cutoffStr = toLocalDateString(thirtyDaysAgo);
    const updatedSolvedDays = solvedDays.filter((d) => d >= cutoffStr).sort();

    if (settings.lastAcceptedDate === todayStr) {
      // Already updated streak today; just refresh solvedDays
      await saveSettings({ solvedDays: updatedSolvedDays });
      return;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);

    const newStreak =
      settings.lastAcceptedDate === yesterdayStr
        ? (settings.currentStreak || 0) + 1
        : 1;

    await saveSettings({
      currentStreak: newStreak,
      lastAcceptedDate: todayStr,
      solvedDays: updatedSolvedDays,
    });

    console.log(`CodeforcesSync: Streak updated → ${newStreak}`);
  } catch (e) {
    console.error("CodeforcesSync: Streak update error", e);
  }
}

// ─── Date helper ──────────────────────────────────────────────────────────────
/** Returns YYYY-MM-DD in local time (avoids UTC drift). */
function toLocalDateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

// ─── Exponential backoff calculator ──────────────────────────────────────────
/**
 * Records a new API failure and returns the number of milliseconds the next
 * sync attempt should be delayed.  Uses a capped exponential backoff strategy:
 *   delay = min(BASE * 2^failures, CAP)
 */
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

/** Resets the backoff counter after a successful API response. */
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

// ─── Resilient CF API fetch ───────────────────────────────────────────────────
/**
 * Fetches `https://codeforces.com/api/user.status` with up to `maxAttempts`
 * retries.  Each attempt is injected into an authenticated Codeforces tab so
 * the request carries the user's session cookies, bypassing Cloudflare's
 * bot-detection checks.
 *
 * Failure modes handled:
 *  • Network / DNS errors   → retried
 *  • Cloudflare HTML page   → detected via Content-Type, retried after 6 s
 *  • CF API status !== 'OK' → logged with comment field, retried
 *  • HTTP 429 / 503         → 10 s cooldown, retried
 *  • HTTP 403               → logged, retried (may be transient)
 *
 * Returns the parsed result array on success, or `null` after all attempts.
 */
async function fetchCodeforcesSubmissions(
  cfTabId: number,
  apiUrl: string,
  maxAttempts: number = 3
): Promise<Submission[] | null> {
  let lastError = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptDelay = attempt > 1 ? 4000 * (attempt - 1) : 0;
    if (attemptDelay > 0) {
      console.log(
        `CodeforcesSync: [CF API] Retry ${attempt}/${maxAttempts} — waiting ${attemptDelay / 1000}s…`
      );
      await new Promise((r) => setTimeout(r, attemptDelay));
    }

    try {
      // Verify the tab still exists before injecting
      let tabStillExists = true;
      try {
        await chrome.tabs.get(cfTabId);
      } catch {
        tabStillExists = false;
      }

      if (!tabStillExists) {
        lastError = "CF tab closed during retry";
        console.warn(`CodeforcesSync: [CF API] ${lastError}. Aborting retries.`);
        break;
      }

      // Inject the fetch into the CF tab so it piggybacks on the user session.
      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: cfTabId },
        // The function runs in the page context and must be self-contained.
        // It is declared async so we can use await for fetch() inside it.
        // The FetchResult shape is guaranteed at runtime even though TypeScript
        // cannot statically verify the return type of an injected async func.
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

      const raw = injectionResult?.[0]?.result;

      if (!raw) {
        lastError = "Script injection returned no result";
        console.error(`CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}`);
        continue;
      }

      if (raw.error && !raw.ok) {
        lastError = `Network error: ${raw.error}`;
        console.error(`CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}`);
        continue;
      }

      if (raw.isHtml) {
        lastError = `Cloudflare HTML challenge (HTTP ${raw.status})`;
        console.warn(
          `CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}. ` +
            "The CF tab may need manual interaction to solve the CAPTCHA."
        );
        await new Promise((r) => setTimeout(r, 6000));
        continue;
      }

      if (!raw.ok) {
        lastError = `HTTP ${raw.status}`;
        if (raw.status === 429 || raw.status === 503) {
          console.warn(
            `CodeforcesSync: [CF API] Attempt ${attempt} — Rate limited (${raw.status}). Backing off 10 s…`
          );
          await new Promise((r) => setTimeout(r, 10_000));
        } else {
          console.error(`CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}`);
        }
        continue;
      }

      // ── Validate CF API response structure ─────────────────────────────────
      const data = raw.body;

      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        lastError = "Response body is not a plain object";
        console.error(`CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}`, data);
        continue;
      }

      // Narrow the type now that we know it's a plain object
      const cfResponse = data as Record<string, unknown>;

      if (cfResponse["status"] !== "OK") {
        const comment = typeof cfResponse["comment"] === "string"
          ? cfResponse["comment"]
          : "none";
        lastError = `CF API status="${cfResponse["status"]}" comment="${comment}"`;
        console.error(`CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}`);
        continue;
      }

      if (!Array.isArray(cfResponse["result"])) {
        lastError = "CF API result field is not an array";
        console.error(`CodeforcesSync: [CF API] Attempt ${attempt} — ${lastError}`, data);
        continue;
      }

      // ── SUCCESS ────────────────────────────────────────────────────────────
      const resultArray = cfResponse["result"] as Submission[];
      console.log(
        `CodeforcesSync: [CF API] Attempt ${attempt} — SUCCESS. ` +
          `Received ${resultArray.length} submission(s).`
      );
      recordApiSuccess();
      return resultArray;
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(
        `CodeforcesSync: [CF API] Attempt ${attempt} — Unexpected exception: ${lastError}`
      );
    }
  }

  // All attempts exhausted
  recordApiFailure(lastError);
  console.error(
    `CodeforcesSync: [CF API] All ${maxAttempts} attempts failed. ` +
      `Last error: "${lastError}". ` +
      `Consecutive failures: ${retryState.consecutiveFailures}. ` +
      `Cooldown until ${new Date(retryState.backoffUntil).toLocaleTimeString()}.`
  );
  return null;
}

// ─── Main sync loop ───────────────────────────────────────────────────────────
/**
 * Fetches the latest accepted submissions from the Codeforces API,
 * extracts their source code via a background tab, and pushes to GitHub.
 *
 * Protected by `isSyncing` to prevent concurrent overlapping executions.
 * Also respects the exponential backoff timer to avoid hammering CF after
 * repeated failures.
 *
 * Storage write ordering guarantee
 * ─────────────────────────────────
 * `syncedSubmissions` is written immediately after each successful GitHub push
 * (not batched at the end of the loop) so a mid-loop crash or SW termination
 * never causes double-uploads of already-committed submissions.
 */
async function syncSolutions(): Promise<void> {
  // ── Concurrency guard ─────────────────────────────────────────────────────
  if (isSyncing) {
    console.log("CodeforcesSync: Sync already in progress, skipping.");
    return;
  }

  // ── Exponential backoff guard ─────────────────────────────────────────────
  if (retryState.backoffUntil > Date.now()) {
    const waitSec = Math.round((retryState.backoffUntil - Date.now()) / 1000);
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

    // ── Streak broken check ───────────────────────────────────────────────────
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

    // ── Credential guard ──────────────────────────────────────────────────────
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

    // ── CF tab guard ──────────────────────────────────────────────────────────
    // Require an open Codeforces tab to piggyback on its authenticated session.
    // This is the core bypass for Cloudflare bot protection: the request is
    // made from inside a tab that already has valid CF session cookies.
    const tabs = await chrome.tabs.query({ url: "*://*.codeforces.com/*" });
    if (tabs.length === 0 || !tabs[0].id) {
      console.log(
        "CodeforcesSync: No Codeforces tab open — skipping to avoid Cloudflare 403."
      );
      return;
    }

    // Prefer a tab that is not currently loading to minimise injection risk.
    const readyTab = tabs.find((t) => t.status === "complete") ?? tabs[0];
    const cfTabId = readyTab.id!;

    console.log(
      `CodeforcesSync: Using CF tab #${cfTabId} ` +
        `(url: ${readyTab.url?.slice(0, 60)}…) for API fetch.`
    );

    // ── Fetch submissions ─────────────────────────────────────────────────────
    const handle = encodeURIComponent(settings.codeforcesHandle.trim());
    // Fetch 30 most recent submissions to reduce misses during backoff windows.
    const apiUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=30`;

    const submissions = await fetchCodeforcesSubmissions(cfTabId, apiUrl, 3);

    if (!submissions) {
      // fetchCodeforcesSubmissions already logged the failure and updated backoff.
      return;
    }

    // ── Filter to unsynced accepted submissions ────────────────────────────────
    const acceptedSubmissions = submissions.filter(
      (sub) => sub.verdict === "OK"
    );

    if (acceptedSubmissions.length === 0) {
      console.log("CodeforcesSync: No accepted submissions in latest batch.");
      return;
    }

    // Read synced list once; write it back after every successful push.
    // This is deliberate: reading once then writing incrementally is correct
    // because isSyncing prevents concurrent sync runs from racing on this array.
    const synced = [...(settings.syncedSubmissions || [])];

    // Process oldest-first so streak chronology is correct
    for (const sub of [...acceptedSubmissions].reverse()) {
      const submissionId = sub.id.toString();

      if (synced.includes(submissionId)) continue;

      // Guard against malformed API responses that omit required fields
      if (!sub.problem?.index || !sub.problem?.name || !sub.programmingLanguage) {
        console.error(
          `CodeforcesSync: Submission ${submissionId} has malformed problem data — skipping.`,
          sub
        );
        continue;
      }

      const contestId = sub.contestId != null ? sub.contestId.toString() : "";
      const problemId = contestId
        ? `${contestId}${sub.problem.index}`
        : sub.problem.index;
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
        // Do NOT add to synced list — will be retried next alarm tick.
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
        // Write immediately so a crash mid-loop doesn't re-upload this one.
        await saveSettings({ syncedSubmissions: synced });
        await updateStreak();
        chrome.runtime.sendMessage({ type: "SYNC_SUCCESS" }).catch(() => {});
      } else {
        console.error(
          `CodeforcesSync: ❌ GitHub push failed for ${submissionId} — will retry next cycle.`
        );
        // Leave out of synced list so we retry the GitHub push next cycle.
      }

      // Throttle to respect GitHub secondary rate limits (1 commit/2.5 s)
      await new Promise((r) => setTimeout(r, 2500));
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("CodeforcesSync: Unexpected error in sync loop:", msg);
    // Record the unexpected failure so backoff kicks in to prevent rapid loops.
    recordApiFailure(`Unexpected error: ${msg}`);
  } finally {
    isSyncing = false;
  }
}
