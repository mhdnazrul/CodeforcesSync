import type { Submission } from "../shared/types/codeforces";
import type { AppSettings } from "../storage";
import { toLocalDateString } from "../shared/utils/date";
import { utf8ToBase64 } from "../shared/utils/encoding";
import { generateFilePath } from "../shared/utils/formatters";
import {
  isAcceptedSubmission,
  getProblemId,
  fetchRssFeed,
  createApiUrl,
} from "../codeforces";
import { computeStreak } from "../statistics";

export interface RetryState {
  consecutiveFailures: number;
  lastFailureTime: number;
  lastFailureReason: string;
  backoffUntil: number;
}

export interface RetryConfig {
  maxConsecutiveFailures: number;
  backoffBaseMs: number;
  backoffCapMs: number;
}

export interface RetryEngine {
  readonly state: RetryState;
  isInBackoff(): boolean;
  recordFailure(reason: string): number;
  recordSuccess(): void;
}

export interface SyncServices {
  findCodeforcesTab(): Promise<number | null>;
  fetchTier1(cfTabId: number, apiUrl: string): Promise<Submission[] | null>;
  extractSource(sub: Submission): Promise<string | null>;
  uploadFile(
    username: string,
    repo: string,
    path: string,
    contentBase64: string,
    message: string,
  ): Promise<boolean>;
  notify(event: "SYNC_SUCCESS"): void;
}

export interface SyncStorage {
  getSettings(): Promise<AppSettings>;
  saveSettings(partial: Partial<AppSettings>): Promise<void>;
}

const DEFAULTS: RetryConfig = {
  maxConsecutiveFailures: 8,
  backoffBaseMs: 30_000,
  backoffCapMs: 960_000,
};

let isSyncing = false;

export function createRetryEngine(config?: Partial<RetryConfig>): RetryEngine {
  const cfg = { ...DEFAULTS, ...config };
  const state: RetryState = {
    consecutiveFailures: 0,
    lastFailureTime: 0,
    lastFailureReason: "",
    backoffUntil: 0,
  };

  return {
    get state() {
      return state;
    },

    isInBackoff(): boolean {
      return state.backoffUntil > Date.now();
    },

    recordFailure(reason: string): number {
      state.consecutiveFailures = Math.min(
        state.consecutiveFailures + 1,
        cfg.maxConsecutiveFailures,
      );
      state.lastFailureTime = Date.now();
      state.lastFailureReason = reason;

      const delayMs = Math.min(
        cfg.backoffBaseMs * Math.pow(2, state.consecutiveFailures - 1),
        cfg.backoffCapMs,
      );
      state.backoffUntil = Date.now() + delayMs;

      console.warn(
        `CodeforcesSync: [Backoff] Failure #${state.consecutiveFailures} — ` +
          `reason: "${reason}". ` +
          `Next retry allowed in ${Math.round(delayMs / 1000)}s ` +
          `(at ${new Date(state.backoffUntil).toLocaleTimeString()}).`,
      );
      return delayMs;
    },

    recordSuccess(): void {
      if (state.consecutiveFailures > 0) {
        console.log(
          `CodeforcesSync: [Backoff] API recovered after ${state.consecutiveFailures} failure(s). Resetting backoff.`,
        );
      }
      state.consecutiveFailures = 0;
      state.lastFailureTime = 0;
      state.lastFailureReason = "";
      state.backoffUntil = 0;
    },
  };
}

async function checkStreakBreak(
  settings: AppSettings,
  todayStr: string,
  notify: (event: "SYNC_SUCCESS") => void,
  saveSettings: (partial: Partial<AppSettings>) => Promise<void>,
): Promise<void> {
  const lastAccepted = settings.lastAcceptedDate;
  if (!lastAccepted) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  if (lastAccepted !== todayStr && lastAccepted !== yesterdayStr) {
    if (settings.currentStreak !== 0) {
      console.log("CodeforcesSync: Streak broken — resetting to 0");
      await saveSettings({ currentStreak: 0 });
      notify("SYNC_SUCCESS");
    }
  }
}

async function updateStreak(storage: SyncStorage): Promise<void> {
  try {
    const settings = await storage.getSettings();
    const result = computeStreak(
      settings.currentStreak,
      settings.lastAcceptedDate,
      settings.solvedDays,
      settings.bestStreak,
    );
    await storage.saveSettings({
      currentStreak: result.newStreak,
      bestStreak: result.newBestStreak,
      lastAcceptedDate: result.newLastAcceptedDate,
      solvedDays: result.updatedSolvedDays,
    });
    console.log(`CodeforcesSync: Streak updated → ${result.newStreak} (best: ${result.newBestStreak})`);
  } catch (e) {
    console.error("CodeforcesSync: Streak update error", e);
  }
}

async function fetchSubmissionsDualTier(
  cfTabId: number | null,
  handle: string,
  apiUrl: string,
  services: SyncServices,
  retry: RetryEngine,
): Promise<Submission[] | null> {
  if (cfTabId !== null) {
    console.log("CodeforcesSync: [Dual Tier] Attempting Tier 1 (Official API)…");
    const tier1Result = await services.fetchTier1(cfTabId, apiUrl);
    if (tier1Result !== null) return tier1Result;
  } else {
    console.log(
      "CodeforcesSync: [Dual Tier] No CF tab open. Skipping Tier 1, attempting Tier 2 (RSS).…",
    );
  }

  console.log("CodeforcesSync: [Dual Tier] Attempting Tier 2 (RSS Feed)…");
  const tier2Result = await fetchRssFeed(handle);
  if (tier2Result !== null) {
    retry.recordSuccess();
    return tier2Result;
  }

  console.error(
    "CodeforcesSync: [Dual Tier] Both Tier 1 (API) and Tier 2 (RSS) failed. " +
      "Activating exponential backoff.",
  );
  retry.recordFailure("Dual-tier fetch: both API and RSS failed");
  return null;
}

async function processSubmissions(
  acceptedSubmissions: Submission[],
  synced: string[],
  settings: AppSettings,
  services: SyncServices,
  storage: SyncStorage,
): Promise<void> {
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
        sub,
      );
      continue;
    }

    const problemId = getProblemId(sub);
    const problemName = sub.problem.name;
    const language = sub.programmingLanguage;

    console.log(
      `CodeforcesSync: Processing new submission ${submissionId} — ${problemId} (${language})`,
    );

    const code = await services.extractSource(sub);
    if (!code) {
      console.error(
        `CodeforcesSync: Source extraction failed for ${submissionId}. Will retry next cycle.`,
      );
      continue;
    }

    const path = generateFilePath(
      problemId,
      problemName,
      language,
      settings.useSubdirectory,
      settings.subdirectoryName,
    );

    const commitMsg = `Sync Codeforces: ${problemId} - ${problemName} [${language}]`;
    const contentBase64 = utf8ToBase64(code);

    const ghRepo = settings.githubRepo;
    const repoOwner = ghRepo.includes("/") ? ghRepo.split("/")[0] : settings.githubUsername;
    const repoName = ghRepo.includes("/") ? ghRepo.split("/")[1] : ghRepo;

    console.log(
      `CodeforcesSync: Uploading ${path} → ${repoOwner}/${repoName}`,
    );

    const success = await services.uploadFile(
      repoOwner,
      repoName,
      path,
      contentBase64,
      commitMsg,
    );

    if (success) {
      console.log(`CodeforcesSync: ✅ Synced ${submissionId} to GitHub`);
      synced.push(submissionId);
      await storage.saveSettings({ syncedSubmissions: synced });
      await updateStreak(storage);
      services.notify("SYNC_SUCCESS");
    } else {
      console.error(
        `CodeforcesSync: ❌ GitHub push failed for ${submissionId} — will retry next cycle.`,
      );
    }

    await new Promise((r) => setTimeout(r, 2500));
  }
}

export async function runSync(
  services: SyncServices,
  storage: SyncStorage,
  retry: RetryEngine,
): Promise<void> {
  if (isSyncing) {
    console.log("CodeforcesSync: Sync already in progress, skipping.");
    return;
  }

  if (retry.isInBackoff()) {
    const waitSec = Math.round(
      (retry.state.backoffUntil - Date.now()) / 1000,
    );
    console.log(
      `CodeforcesSync: [Backoff] In cooldown — ${waitSec}s remaining ` +
        `(last failure: "${retry.state.lastFailureReason}"). Skipping this tick.`,
    );
    return;
  }

  isSyncing = true;

  try {
    const settings = await storage.getSettings();
    const now = new Date();
    const todayStr = toLocalDateString(now);

    await checkStreakBreak(
      settings,
      todayStr,
      services.notify,
      storage.saveSettings.bind(storage),
    );

    if (
      !settings.githubToken ||
      !settings.githubRepo ||
      !settings.githubUsername ||
      !settings.codeforcesHandle
    ) {
      console.log(
        "CodeforcesSync: Sync aborted — missing GitHub credentials or Codeforces handle.",
      );
      return;
    }

    const cfTabId = await services.findCodeforcesTab();

    if (cfTabId === null) {
      console.log(
        "CodeforcesSync: No Codeforces tab open. Will attempt RSS feed fallback.",
      );
    }

    const apiUrl = createApiUrl(settings.codeforcesHandle.trim());

    const submissions = await fetchSubmissionsDualTier(
      cfTabId,
      settings.codeforcesHandle.trim(),
      apiUrl,
      services,
      retry,
    );

    if (!submissions) return;

    const acceptedSubmissions = submissions.filter(isAcceptedSubmission);

    if (acceptedSubmissions.length === 0) {
      console.log("CodeforcesSync: No accepted submissions in latest batch.");
      return;
    }

    const synced = [...(settings.syncedSubmissions || [])];
    await processSubmissions(acceptedSubmissions, synced, settings, services, storage);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("CodeforcesSync: Unexpected error in sync loop:", msg);
    retry.recordFailure(`Unexpected error: ${msg}`);
  } finally {
    isSyncing = false;
  }
}
