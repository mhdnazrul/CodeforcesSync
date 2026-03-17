import { GithubHandler } from "../utils/githubAPI";
import { getSettings, saveSettings } from "../utils/storage";
import { generateFilePath } from "../utils/formatters";

const github = new GithubHandler();

/**
 * Initializes the Alarms API for periodic polling
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "codeforces-sync") {
    console.log("CodeforcesSync: Running background sync interval...");
    syncSolutions();
  }
});

// Run every 1 minute
chrome.alarms.create("codeforces-sync", { periodInMinutes: 1 });

/**
 * Unescapes basic HTML entities found in Codeforces source code blocks
 */
function unescapeHtml(safe: string) {
  return (
    safe
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // CF sometimes uses these
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
  );
}

/**
 * Detects the type of submission and builds the correct Codeforces URL.
 * Supports: Contests, Problemset, Gym, and Groups.
 */
function generateSubmissionUrl(sub: any): string {
  const submissionId = sub.id;
  const contestId = sub.contestId;
  const isGym = contestId >= 100000; // Typical threshold for Gym contests

  if (isGym) {
    return `https://codeforces.com/gym/${contestId}/submission/${submissionId}`;
  }
  
  // Standard Contest / Problemset URL
  // Problemset submissions can usually be accessed via the contest path as well
  return `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
}

/**
 * Ultra-robust source code extraction using separate tab navigation.
 * Bypasses CSP, Cloudflare, and complex HTML structures.
 */
async function fetchSourceCode(sub: any): Promise<string | null> {
  const url = generateSubmissionUrl(sub);
  const submissionId = sub.id;

  try {
    console.log(`CodeforcesSync: Creating extraction tab for ${submissionId}: ${url}`);
    const tab = await chrome.tabs.create({ url, active: false });

    try {
      // 1. Wait for tab to be fully loaded
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          reject(new Error("Tab load timeout (25s)"));
        }, 25000);

        function listener(tabId: number, info: any) {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(timeout);
            resolve(true);
          }
        }
        chrome.tabs.onUpdated.addListener(listener);
      });

      // 2. Inject extraction script with fallback selectors
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: () => {
          // Use multiple robust selectors as requested
          const selectors = [
            '#program-source-text',
            '.program-source',
            'pre.prettyprint',
            '.source-code'
          ];

          for (const selector of selectors) {
            const el = document.querySelector(selector) as HTMLElement;
            if (el && el.innerText.trim().length > 0) {
              console.log(`CodeforcesSync: Found code via ${selector}`);
              return el.innerText;
            }
          }
          return null;
        },
      });

      if (results && results[0].result) {
        console.log(`CodeforcesSync: Successfully extracted code for ${submissionId}`);
        return unescapeHtml(results[0].result as string);
      }

      console.error(`CodeforcesSync: All extraction selectors failed for ${submissionId}`);
      return null;
    } finally {
      // 3. Cleanup: Always close the tab
      if (tab.id) {
        chrome.tabs.remove(tab.id).catch(() => {});
      }
    }
  } catch (e: any) {
    console.error(`CodeforcesSync: Extraction engine failure for ${submissionId}:`, e.message);
    return null;
  }
}

/**
 * UTF-8 safe base64 encoding for Service Workers
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function updateStreak() {
  try {
    const settings = await getSettings();
    const now = new Date();

    // YYYY-MM-DD local time
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

    const solvedDays = settings.solvedDays || [];
    if (!solvedDays.includes(todayStr)) {
      solvedDays.push(todayStr);
    }

    // Keep only last 30 days of activity to keep storage clean
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = new Date(
      thirtyDaysAgo.getTime() - thirtyDaysAgo.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0];

    const updatedSolvedDays = solvedDays
      .filter((date) => date >= thirtyDaysAgoStr)
      .sort();

    const lastStr = settings.lastAcceptedDate;

    if (lastStr === todayStr) {
      await saveSettings({ solvedDays: updatedSolvedDays });
      return; // streak already updated today, but solvedDays might have changed (e.g. if we sync older submissions)
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = new Date(
      yesterday.getTime() - yesterday.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0];

    let newStreak = 1;
    if (lastStr === yesterdayStr) {
      // Continuation
      newStreak = (settings.currentStreak || 0) + 1;
    }

    await saveSettings({
      currentStreak: newStreak,
      lastAcceptedDate: todayStr,
      solvedDays: updatedSolvedDays,
    });
    console.log(`CodeforcesSync: Streak updated to ${newStreak}`);
  } catch (e) {
    console.error("CodeforcesSync: Streak update error", e);
  }
}

/**
 * Main logical loop: Fetches API, filters OK verdicts, checks dupes, and pushes.
 */
async function syncSolutions() {
  try {
    const settings = await getSettings();
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

    // Check if streak is broken (missed yesterday)
    const lastAccepted = settings.lastAcceptedDate;
    if (lastAccepted) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = new Date(
        yesterday.getTime() - yesterday.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];

      if (lastAccepted !== todayStr && lastAccepted !== yesterdayStr) {
        if (settings.currentStreak !== 0) {
          console.log("CodeforcesSync: Streak broken, resetting to 0");
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
        "CodeforcesSync: Sync aborted. Missing GitHub credentials or Codeforces Handle.",
      );
      return;
    }

    // Check for open CF tab before proceeding since Cloudflare blocks background fetches
    const tabs = await chrome.tabs.query({ url: "*://*.codeforces.com/*" });
    if (tabs.length === 0 || !tabs[0].id) {
      console.log(
        "CodeforcesSync: No Codeforces tab automatically open. Sleeping sync to avoid Cloudflare 403 block.",
      );
      return;
    }
    const cfTabId = tabs[0].id;

    // 1. Fetch from Codeforces API securely inside the active Tab
    const handle = settings.codeforcesHandle.trim();
    const apiUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=15`;

    let data: any = null;
    const apiResults = await chrome.scripting.executeScript({
      target: { tabId: cfTabId },
      func: async (fetchUrl) => {
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          return null;
        }
      },
      args: [apiUrl],
    });

    if (apiResults && apiResults[0].result) {
      data = apiResults[0].result;
    }

    if (!data || data.status !== "OK" || !data.result) {
      console.error(
        "CodeforcesSync: Failed to fetch API or Cloudflare blocked the tab request.",
      );
      return;
    }

    // 2. Filter for accepted submissions
    const submissions = data.result;
    const acceptedSubmissions = submissions.filter(
      (sub: any) => sub.verdict === "OK",
    );

    if (acceptedSubmissions.length === 0) {
      console.log(
        "CodeforcesSync: No Accepted submissions found in the latest fetch.",
      );
      return;
    }

    const synced = settings.syncedSubmissions || [];

    // 3. Process each submission
    // We process from oldest to newest in our array slice so streaks process correctly if missed
    for (const sub of acceptedSubmissions.reverse()) {
      const submissionId = sub.id.toString();
      const contestId = sub.contestId ? sub.contestId.toString() : "";
      const problemId = contestId
        ? `${contestId}${sub.problem.index}`
        : sub.problem.index;
      const problemName = sub.problem.name;
      const language = sub.programmingLanguage;

      if (synced.includes(submissionId)) {
        continue; // Skip already synced
      }

      console.log(
        `CodeforcesSync: Found new Accepted submission: ${submissionId} for Problem ${problemId}`,
      );

      // 4. Extract Source Code via navigation (No fetch!)
      const code = await fetchSourceCode(sub);
      if (!code) {
        console.error(
          `CodeforcesSync: Extraction failed for ${submissionId}. Retrying might be needed later.`,
        );
        continue;
      }

      // 5. Generate Filename
      const path = generateFilePath(
        problemId,
        problemName,
        language,
        settings.useSubdirectory,
        settings.subdirectoryName,
      );

      // Verify extension for devTools logging
      const extMatch = path.match(/\.[a-zA-Z0-9]+$/);
      const extVal = extMatch ? extMatch[0] : ".txt";
      if (extVal === ".txt") {
        console.warn(
          `CodeforcesSync: Unrecognized language '${language}'. Defaulting to '.txt' for ${problemId}`
        );
      } else {
        console.log(
          `CodeforcesSync: Detected language '${language}' -> Extension '${extVal}'`
        );
      }

      // 6. Encode and Push to GitHub
      const contentBase64 = utf8ToBase64(code);
      const commitMsg = `Sync Codeforces: ${problemId} - ${problemName} [${language}]`;

      console.log(
        `CodeforcesSync: Uploading to GitHub: ${settings.githubUsername}/${settings.githubRepo} at ${path}`,
      );

      const success = await github.uploadFile(
        settings.githubUsername,
        settings.githubRepo,
        path,
        contentBase64,
        commitMsg,
      );

      if (success) {
        console.log(
          `CodeforcesSync: Successfully synced ${submissionId} to GitHub!`,
        );

        // Mark submission as permanently synced to prevent duplicates
        synced.push(submissionId);
        await saveSettings({ syncedSubmissions: synced });

        await updateStreak();

        // Let UI know to refresh if open
        chrome.runtime.sendMessage({ type: "SYNC_SUCCESS" }).catch(() => {});
      } else {
        console.error(
          `CodeforcesSync: Failed to sync ${submissionId} to GitHub.`,
        );
      }

      // **CRITICAL THROTTLE**: Wait 2.5 seconds before processing the next submission.
      // Eases GitHub Secondary Rate Limits and Codeforces scraping limits.
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  } catch (error) {
    console.error("CodeforcesSync: Error during sync loop:", error);
  }
}
