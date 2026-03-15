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
 * Fetches the HTML of a submission either via an active Codeforces tab (to bypass Cloudflare Bot Protection)
 * or via standard fetch as a fallback.
 */
async function fetchSourceCode(
  contestId: string,
  submissionId: string,
  tabId?: number,
): Promise<string | null> {
  try {
    let url = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
    if (!contestId) {
      url = `https://codeforces.com/problemset/submission/${submissionId}`; // Fallback if contestId was not extracted
    }

    let html = "";

    // Cloudflare blocks Service Worker anonymous fetches, so we inject the fetch
    // securely into an open Codeforces tab to use the active Session.
    if (tabId !== undefined) {
      console.log(
        `CodeforcesSync: Fetching source utilizing Codeforces tab ID ${tabId}`,
      );
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: async (fetchUrl) => {
          try {
            const res = await fetch(fetchUrl);
            return { ok: true, text: await res.text(), status: res.status };
          } catch (e: any) {
            return { ok: false, error: e.toString() };
          }
        },
        args: [url],
      });
      if (results && results[0].result) {
        const payload = results[0].result as any;
        if (payload && payload.ok) {
          html = payload.text;
          if (payload.status !== 200) {
             console.warn(`CodeforcesSync: Tab fetch returned non-200 status: ${payload.status}`);
          }
        } else {
          console.error(`CodeforcesSync: Tab fetch exception inside page: ${payload?.error}`);
        }
      }
    }

    if (!html || html.trim() === "") {
      console.log(
        "CodeforcesSync: Tab fetch failed (HTML was empty or injection failed). Attempting background fetch fallback...",
      );
      const response = await fetch(url, { credentials: "include" });
      html = await response.text();
    }

    // Checking if Cloudflare blocked us
    if (
      html.includes("Just a moment...") &&
      html.includes("challenge-error-text")
    ) {
      console.error(
        "CodeforcesSync: Blocked by Cloudflare. A Codeforces tab must be actively open to bypass bot protection.",
      );
      return null;
    }

    // We look for <pre id="program-source-text" ...> ... </pre>
    const match = html.match(
      /<pre[^>]*id="program-source-text"[^>]*>([\s\S]*?)<\/pre>/i,
    );
    if (!match || match.length < 2) {
      console.error(
        `CodeforcesSync: Could not find source code in HTML for submission ${submissionId}`,
      );
      return null;
    }

    return unescapeHtml(match[1]);
  } catch (e) {
    console.error(
      "CodeforcesSync: Error fetching source code from Codeforces:",
      e,
    );
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

    const lastStr = settings.lastAcceptedDate;

    if (lastStr === todayStr) {
      return; // already updated today
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
    console.log("CodeforcesSync: Starting sync execution...");
    const settings = await getSettings();

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

      // 4. Extract Source Code
      const code = await fetchSourceCode(contestId, submissionId, cfTabId);
      if (!code) {
        console.error(
          `CodeforcesSync: No code extracted for ${submissionId}. Skipping.`,
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
