import type { Submission } from "../shared/types/codeforces";
import type { Tab, TabsService, ScriptingService } from "../shared/types/browser";
import { unescapeHtml } from "../shared/utils/encoding";
import { generateSubmissionUrl } from "../codeforces";
import { extractSourceCode } from "../content/sourceExtractor";

export async function fetchSourceCode(
  sub: Submission,
  tabs: TabsService,
  scripting: ScriptingService,
): Promise<string | null> {
  const url = generateSubmissionUrl(sub);
  const submissionId = sub.id;

  console.log(
    `CodeforcesSync: [Extraction] Opening background tab for submission ${submissionId}`,
  );

  let tab: Tab | null = null;

  try {
    tab = await tabs.create({ url, active: false });

    await new Promise<void>((resolve, reject) => {
      const tabId = tab!.id!;
      let listenerAttached = false;

      const timeout = setTimeout(() => {
        if (listenerAttached) {
          tabs.onUpdated.removeListener(onUpdated as (...args: unknown[]) => void);
        }
        reject(new Error(`Tab load timeout (30s) for submission ${submissionId}`));
      }, 30_000);

      function onUpdated(updatedTabId: number, info: { status?: string }) {
        if (updatedTabId === tabId && info.status === "complete") {
          tabs.onUpdated.removeListener(onUpdated as (...args: unknown[]) => void);
          listenerAttached = false;
          clearTimeout(timeout);
          resolve();
        }
      }

      tabs.onUpdated.addListener(onUpdated);
      listenerAttached = true;
    });

    await new Promise((r) => setTimeout(r, 2000));

    const results = await scripting.executeScript({
      target: { tabId: tab.id! },
      func: extractSourceCode,
    });

    if (results?.[0]?.result) {
      console.log(
        `CodeforcesSync: [Extraction OK] Submission ${submissionId}`,
      );
      return unescapeHtml(results[0].result as string);
    }

    console.error(
      `CodeforcesSync: [Extraction Failed] No source found for ${submissionId}`,
    );
    return null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `CodeforcesSync: [Extraction Error] Submission ${submissionId}: ${msg}`,
    );
    return null;
  } finally {
    if (tab?.id != null) {
      tabs.remove(tab.id).catch(() => {});
    }
  }
}
