import { GithubHandler } from "../utils/githubAPI";
import { getSettings, saveSettings } from "../utils/storage";
import { generateFilePath } from "../utils/formatters";

const github = new GithubHandler();

// ─── Concurrency guard ────────────────────────────────────────────────────────
// Prevents overlapping sync runs if the Service Worker alarm fires while a
// previous sync is still in progress (each submission takes several seconds).
let isSyncing = false;

// ─── Alarm setup ─────────────────────────────────────────────────────────────
// Check before creating to avoid duplicate alarms on Service Worker restarts.
chrome.alarms.get("codeforces-sync", (existing) => {
  if (!existing) {
    chrome.alarms.create("codeforces-sync", { periodInMinutes: 1 });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "codeforces-sync") {
    console.log("CodeforcesSync: Running background sync interval...");
    syncSolutions();
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
 */
function generateSubmissionUrl(sub: any): string {
  const { id: submissionId, contestId } = sub;

  if (contestId >= 100000) {
    console.log(
      `CodeforcesSync: Gym submission ${submissionId} (contest ${contestId})`
    );
    return `https://codeforces.com/gym/${contestId}/submission/${submissionId}`;
  }

  console.log(
    `CodeforcesSync: Contest submission ${submissionId} (contest ${contestId})`
  );
  return `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
}

// ─── Source code extractor ────────────────────────────────────────────────────
/**
 * Opens a BACKGROUND (hidden) tab to scrape the submission source code.
 *
 * KEY FIX: `active: false` — the tab is created silently without stealing
 * browser focus or becoming visible to the user. This eliminates the loop
 * where each opened tab matched the CF tab query and triggered further syncs.
 */
async function fetchSourceCode(sub: any): Promise<string | null> {
  const url = generateSubmissionUrl(sub);
  const submissionId = sub.id;

  console.log(
    `CodeforcesSync: [Extraction] Opening background tab for submission ${submissionId}`
  );

  let tab: chrome.tabs.Tab | null = null;

  try {
    // ✅ FIXED: active: false — silent background tab, never steals focus
    tab = await chrome.tabs.create({ url, active: false });

    // Wait for the tab to reach "complete" status (max 25s)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error("Tab load timeout (25s)"));
      }, 25000);

      function listener(tabId: number, info: { status?: string }) {
        if (tabId === tab!.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeout);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Brief stabilization delay for dynamic syntax highlighters
    await new Promise((r) => setTimeout(r, 2000));

    // Inject extraction script with retry loop
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: async () => {
        const selectors = [
          "#program-source-text",
          ".program-source",
          "pre.prettyprint",
          ".source-code",
          "#sourceCode",
          "div.source-code pre",
        ];

        const wait = (ms: number) =>
          new Promise((r) => setTimeout(r, ms));

        for (let attempt = 1; attempt <= 12; attempt++) {
          // Try known selectors first
          for (const selector of selectors) {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el && el.innerText.trim().length > 20) {
              console.log(
                `CodeforcesSync (Tab): Found via "${selector}" on attempt ${attempt}`
              );
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
              console.log(
                `CodeforcesSync (Tab): Found via largest <pre> on attempt ${attempt}`
              );
              return largest.innerText;
            }
          }

          await wait(500);
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
      `CodeforcesSync: [Extraction Failed] All attempts failed for ${submissionId}`
    );
    return null;
  } catch (e: any) {
    console.error(
      `CodeforcesSync: [Extraction Error] Submission ${submissionId}:`,
      e.message
    );
    return null;
  } finally {
    // Always close the background tab when done
    if (tab?.id) {
      chrome.tabs.remove(tab.id).catch(() => {});
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

// ─── Main sync loop ───────────────────────────────────────────────────────────
/**
 * Fetches the latest accepted submissions from the Codeforces API,
 * extracts their source code via a background tab, and pushes to GitHub.
 *
 * Protected by `isSyncing` to prevent concurrent overlapping executions.
 */
async function syncSolutions(): Promise<void> {
  // ✅ FIXED: Concurrency guard — skip if a sync is already running
  if (isSyncing) {
    console.log("CodeforcesSync: Sync already in progress, skipping.");
    return;
  }
  isSyncing = true;

  try {
    const settings = await getSettings();
    const now = new Date();
    const todayStr = toLocalDateString(now);

    // Check if streak is broken (missed a day)
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

    // Require all credentials before syncing
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

    // Require an open Codeforces tab to use its authenticated session for the API
    const tabs = await chrome.tabs.query({ url: "*://*.codeforces.com/*" });
    if (tabs.length === 0 || !tabs[0].id) {
      console.log(
        "CodeforcesSync: No Codeforces tab open — skipping to avoid Cloudflare 403."
      );
      return;
    }
    const cfTabId = tabs[0].id;

    // Fetch submission list through the open CF tab (bypasses Cloudflare)
    const handle = settings.codeforcesHandle.trim();
    const apiUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=15`;

    const apiResults = await chrome.scripting.executeScript({
      target: { tabId: cfTabId },
      func: async (fetchUrl: string) => {
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      },
      args: [apiUrl],
    });

    const data = apiResults?.[0]?.result;
    if (!data || data.status !== "OK" || !Array.isArray(data.result)) {
      console.error(
        "CodeforcesSync: API fetch failed or Cloudflare blocked the request."
      );
      return;
    }

    const acceptedSubmissions: any[] = data.result.filter(
      (sub: any) => sub.verdict === "OK"
    );

    if (acceptedSubmissions.length === 0) {
      console.log("CodeforcesSync: No accepted submissions in latest batch.");
      return;
    }

    const synced = [...(settings.syncedSubmissions || [])];

    // Process oldest-first so streak chronology is correct
    for (const sub of acceptedSubmissions.reverse()) {
      const submissionId = sub.id.toString();

      if (synced.includes(submissionId)) continue;

      const contestId = sub.contestId ? sub.contestId.toString() : "";
      const problemId = contestId
        ? `${contestId}${sub.problem.index}`
        : sub.problem.index;
      const problemName: string = sub.problem.name;
      const language: string = sub.programmingLanguage;

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
          `CodeforcesSync: ❌ GitHub push failed for ${submissionId}`
        );
      }

      // Throttle to respect GitHub secondary rate limits
      await new Promise((r) => setTimeout(r, 2500));
    }
  } catch (error) {
    console.error("CodeforcesSync: Unexpected error in sync loop:", error);
  } finally {
    isSyncing = false;
  }
}
