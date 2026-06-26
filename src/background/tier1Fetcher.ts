import type { Submission } from "../shared/types/codeforces";
import type { TabsService, ScriptingService } from "../shared/types/browser";
import { fetchSubmissions, type InjectedFetchResult } from "../content/tier1Fetcher";

export async function fetchCodeforcesSubmissionsTier1(
  cfTabId: number,
  apiUrl: string,
  tabs: TabsService,
  scripting: ScriptingService,
): Promise<Submission[] | null> {
  const maxAttempts = 2;
  let lastError = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptDelay = attempt > 1 ? 4000 : 0;
    if (attemptDelay > 0) {
      console.log(
        `CodeforcesSync: [API Tier 1] Retry ${attempt}/${maxAttempts} — waiting ${attemptDelay / 1000}s…`,
      );
      await new Promise((r) => setTimeout(r, attemptDelay));
    }

    try {
      let tabStillExists = true;
      try {
        await tabs.get(cfTabId);
      } catch {
        tabStillExists = false;
      }

      if (!tabStillExists) {
        lastError = "CF tab closed during retry";
        console.warn(
          `CodeforcesSync: [API Tier 1] ${lastError}. Failing over to Tier 2.`,
        );
        return null;
      }

      const injectionResult = await scripting.executeScript({
        target: { tabId: cfTabId },
        func: fetchSubmissions as (...args: unknown[]) => unknown,
        args: [apiUrl],
      });

      const raw = (injectionResult?.[0]?.result) as InjectedFetchResult | undefined;

      if (!raw) {
        lastError = "Script injection returned no result";
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
        );
        continue;
      }

      if (raw.error && !raw.ok) {
        lastError = `Network error: ${raw.error}`;
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
        );
        continue;
      }

      if (raw.isHtml) {
        lastError = `Cloudflare HTML challenge (HTTP ${raw.status})`;
        console.warn(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}. Failing over to Tier 2.`,
        );
        return null;
      }

      if (!raw.ok) {
        if (raw.status === 429 || raw.status === 503 || raw.status === 502) {
          console.warn(
            `CodeforcesSync: [API Tier 1] Attempt ${attempt} — HTTP ${raw.status}. Fail-fast to Tier 2.`,
          );
          return null;
        }
        lastError = `HTTP ${raw.status}`;
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
        );
        continue;
      }

      const data = raw.body;

      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        lastError = "Response body is not a plain object";
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
          data,
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
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
        );
        continue;
      }

      if (!Array.isArray(cfResponse["result"])) {
        lastError = "CF API result field is not an array";
        console.error(
          `CodeforcesSync: [API Tier 1] Attempt ${attempt} — ${lastError}`,
          data,
        );
        continue;
      }

      const resultArray = cfResponse["result"] as Submission[];
      console.log(
        `CodeforcesSync: [API Tier 1] Attempt ${attempt} — SUCCESS. ` +
          `Received ${resultArray.length} submission(s).`,
      );
      return resultArray;
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(
        `CodeforcesSync: [API Tier 1] Attempt ${attempt} — Unexpected exception: ${lastError}`,
      );
    }
  }

  console.warn(
    `CodeforcesSync: [API Tier 1] All ${maxAttempts} attempts failed. ` +
      `Last error: "${lastError}". Attempting Tier 2 (RSS).`,
  );
  return null;
}
