import type { Submission } from "../shared/types/codeforces";
import type { TabsService, ScriptingService, RuntimeService } from "../shared/types/browser";
import type { RetryEngine, SyncStorage } from "../sync";
import { runSync } from "../sync";
import { fetchSourceCode } from "./sourceExtractor";
import { fetchCodeforcesSubmissionsTier1 } from "./tier1Fetcher";

export async function runSyncWorker(
  tabs: TabsService,
  scripting: ScriptingService,
  runtime: RuntimeService,
  uploadFile: (
    username: string,
    repo: string,
    path: string,
    contentBase64: string,
    message: string,
  ) => Promise<boolean>,
  storage: SyncStorage,
  retry: RetryEngine,
): Promise<void> {
  const services = {
    findCodeforcesTab: async () => {
      const codeforcesTabs = await tabs.query({ url: "*://*.codeforces.com/*" });
      const cfTabId = codeforcesTabs.length > 0 && codeforcesTabs[0].id ? codeforcesTabs[0].id : null;
      if (cfTabId !== null) {
        const readyTab = codeforcesTabs.find((t) => t.status === "complete") ?? codeforcesTabs[0];
        console.log(
          `CodeforcesSync: Using CF tab #${readyTab.id} ` +
            `(url: ${readyTab.url?.slice(0, 60)}…) for API fetch.`,
        );
      }
      return cfTabId;
    },
    fetchTier1: async (cfTabId: number, apiUrl: string) => {
      const result = await fetchCodeforcesSubmissionsTier1(cfTabId, apiUrl, tabs, scripting);
      if (result !== null) retry.recordSuccess();
      return result;
    },
    extractSource: (sub: Submission) => fetchSourceCode(sub, tabs, scripting),
    uploadFile,
    notify: (event: "SYNC_SUCCESS") => {
      runtime.sendMessage({ type: event }).catch(() => {});
    },
  };

  return runSync(services, storage, retry);
}
