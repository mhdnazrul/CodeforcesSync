import { browserApi } from "../platform/browser";

export interface CfStats {
  totalSubmissions: number;
  accepted: number;
  wrongAnswer: number;
  timeLimitExceeded: number;
  runtimeError: number;
  compilationError: number;
  memoryLimitExceeded: number;
  outputLimitExceeded: number;
  presentationError: number;
  uniqueSolvedProblems: number;
  acceptanceRate: number;
  currentRating: number | null;
  maxRating: number | null;
  currentRank: string | null;
  maxRank: string | null;
  lastUpdated: number;
}

const CACHE_KEY = "cfStatsCache";
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

interface CacheEntry {
  handle: string;
  stats: CfStats;
  timestamp: number;
}

const inflightRequests = new Map<string, Promise<CfStats>>();

async function getCached(handle: string): Promise<{ entry: CacheEntry | null; fresh: boolean }> {
  const data = await browserApi.storage.local.get(CACHE_KEY);
  const entry = (data[CACHE_KEY] as CacheEntry | undefined) ?? null;
  if (entry && entry.handle === handle && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return { entry, fresh: true };
  }
  return { entry: entry?.handle === handle ? entry : null, fresh: false };
}

async function setCached(handle: string, stats: CfStats): Promise<void> {
  const entry: CacheEntry = { handle, stats, timestamp: Date.now() };
  await browserApi.storage.local.set({ [CACHE_KEY]: entry });
}

interface StatusSubmission {
  verdict?: string;
  contestId?: number;
  problem?: { index?: string };
}

interface StatusResponse {
  status: string;
  result: StatusSubmission[];
  comment?: string;
}

interface InfoUser {
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
}

interface InfoResponse {
  status: string;
  result: InfoUser[];
  comment?: string;
}

function validateStatusResponse(data: unknown): data is StatusResponse {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (obj.status !== "OK") return false;
  if (!Array.isArray(obj.result)) return false;
  return true;
}

function validateInfoResponse(data: unknown): data is InfoResponse {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (obj.status !== "OK") return false;
  if (!Array.isArray(obj.result) || obj.result.length === 0) return false;
  return true;
}

async function fetchAndCompute(handle: string): Promise<CfStats> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let statusRes: Response;
  let infoRes: Response;

  try {
    [statusRes, infoRes] = await Promise.all([
      fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=100000`,
        { signal: controller.signal }
      ),
      fetch(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
        { signal: controller.signal }
      ),
    ]);
    clearTimeout(timer);
  } catch (err) {
    clearTimeout(timer);
    controller.abort();
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Codeforces API request timed out");
    }
    throw err;
  }

  if (!statusRes.ok) {
    const body = await statusRes.json().catch(() => ({}));
    throw new Error(
      body?.comment || `Codeforces API user.status returned ${statusRes.status}`
    );
  }
  if (!infoRes.ok) {
    const body = await infoRes.json().catch(() => ({}));
    throw new Error(
      body?.comment || `Codeforces API user.info returned ${infoRes.status}`
    );
  }

  const statusJson: unknown = await statusRes.json();
  const infoJson: unknown = await infoRes.json();

  if (!validateStatusResponse(statusJson)) {
    throw new Error(
      (statusJson as Record<string, unknown>)?.comment?.toString() ||
        "Invalid user.status response from Codeforces API"
    );
  }
  if (!validateInfoResponse(infoJson)) {
    throw new Error(
      (infoJson as Record<string, unknown>)?.comment?.toString() ||
        "Invalid user.info response from Codeforces API"
    );
  }

  const submissions = statusJson.result;
  const userInfo = infoJson.result[0];

  let accepted = 0,
    wrongAnswer = 0,
    tle = 0,
    rte = 0,
    ce = 0,
    mle = 0,
    ole = 0,
    pe = 0;
  const solvedSet = new Set<string>();

  for (const sub of submissions) {
    const v = sub.verdict;
    if (!v) continue;
    switch (v) {
      case "OK": {
        accepted++;
        const contestId = sub.contestId;
        const idx = sub.problem?.index;
        if (contestId && idx) solvedSet.add(`${contestId}-${idx}`);
        else if (idx) solvedSet.add(idx);
        break;
      }
      case "WRONG_ANSWER":
        wrongAnswer++;
        break;
      case "TIME_LIMIT_EXCEEDED":
        tle++;
        break;
      case "RUNTIME_ERROR":
        rte++;
        break;
      case "COMPILATION_ERROR":
        ce++;
        break;
      case "MEMORY_LIMIT_EXCEEDED":
        mle++;
        break;
      case "OUTPUT_LIMIT_EXCEEDED":
        ole++;
        break;
      case "PRESENTATION_ERROR":
        pe++;
        break;
    }
  }

  const totalSubmissions = submissions.length;
  const acceptanceRate =
    totalSubmissions > 0 ? Math.round((accepted / totalSubmissions) * 100) : 0;

  return {
    totalSubmissions,
    accepted,
    wrongAnswer,
    timeLimitExceeded: tle,
    runtimeError: rte,
    compilationError: ce,
    memoryLimitExceeded: mle,
    outputLimitExceeded: ole,
    presentationError: pe,
    uniqueSolvedProblems: solvedSet.size,
    acceptanceRate,
    currentRating: userInfo.rating ?? null,
    maxRating: userInfo.maxRating ?? null,
    currentRank: userInfo.rank ?? null,
    maxRank: userInfo.maxRank ?? null,
    lastUpdated: Date.now(),
  };
}

export async function getCfStats(handle: string): Promise<CfStats> {
  const { entry, fresh } = await getCached(handle);
  if (fresh && entry) return entry.stats;

  const inflight = inflightRequests.get(handle);
  if (inflight) return inflight;

  const promise = fetchAndCompute(handle);
  inflightRequests.set(handle, promise);

  try {
    const stats = await promise;
    await setCached(handle, stats);
    return stats;
  } catch (err) {
    if (entry) {
      console.warn(
        "CodeforcesSync: CF API fetch failed, serving stale cache",
        err instanceof Error ? err.message : err
      );
      return entry.stats;
    }
    console.warn(
      "CodeforcesSync: CF API fetch failed with no cached data available",
      err instanceof Error ? err.message : err
    );
    throw err;
  } finally {
    inflightRequests.delete(handle);
  }
}
