import type { Submission } from "../shared/types/codeforces";

export function generateSubmissionUrl(sub: Submission): string {
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

export interface RssEntry {
  title: string;
  link: string;
  description: string;
}

export function parseRssEntries(entries: RssEntry[]): Submission[] {
  const submissions: Submission[] = [];

  for (const entry of entries) {
    const statusMatch = entry.description.match(/status\s*[:=]\s*(OK|WRONG)/i);
    const verdict = statusMatch && statusMatch[1].toUpperCase() === "OK" ? "OK" : "";

    if (verdict !== "OK") continue;

    const submissionMatch = entry.link.match(
      /\/(gym|contest)\/(\d+)\/submission\/(\d+)/
    );
    if (!submissionMatch) continue;

    const contestId = parseInt(submissionMatch[2], 10);
    const submissionId = parseInt(submissionMatch[3], 10);

    const problemMatch = entry.title.match(/(\w+)\s*[-–]\s*(.+?)\s*\[/i);
    const problemIndex = problemMatch ? problemMatch[1].trim() : "";
    const problemName = problemMatch
      ? problemMatch[2].trim()
      : entry.title.slice(0, 50);

    const langMatch = entry.title.match(/\[([^\]]+)\]\s*$/);
    const language = langMatch ? langMatch[1].trim() : "Unknown";

    if (submissionId && problemIndex) {
      submissions.push({
        id: submissionId,
        contestId,
        verdict: "OK",
        programmingLanguage: language,
        problem: {
          index: problemIndex,
          name: problemName,
        },
      });
    }
  }

  return submissions;
}

export function parseRssFeed(xmlText: string): Submission[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    if (doc.documentElement.nodeName === "parsererror") {
      console.error(
        `CodeforcesSync: [RSS] XML parse error: ${doc.documentElement.textContent}`
      );
      return [];
    }

    const isAtom = doc.getElementsByTagName("item").length === 0;
    const elements = isAtom
      ? Array.from(doc.getElementsByTagName("entry"))
      : Array.from(doc.getElementsByTagName("item"));

    const entries: RssEntry[] = elements.map((el) => {
      const titleEl = el.getElementsByTagName("title")[0];
      const title = titleEl ? titleEl.textContent || "" : "";

      const linkEl = el.querySelector(
        'link[rel="alternate"], link:not([rel])'
      );
      const link = linkEl?.getAttribute("href") || linkEl?.textContent || "";

      const descEl = el.getElementsByTagName("description")[0];
      const description = descEl ? descEl.textContent || "" : "";

      return { title, link, description };
    });

    return parseRssEntries(entries);
  } catch (e) {
    console.error(
      `CodeforcesSync: [RSS] Parse exception: ${e instanceof Error ? e.message : String(e)}`
    );
    return [];
  }
}

export async function fetchRssFeed(
  handle: string
): Promise<Submission[] | null> {
  const feedUrls = [
    `https://codeforces.com/rss/submissions/user/${encodeURIComponent(handle)}`,
    `https://codeforces.com/atom/user/${encodeURIComponent(
      handle
    )}/submissions`,
  ];

  for (let i = 0; i < feedUrls.length; i++) {
    const feedUrl = feedUrls[i];
    try {
      console.log(
        `CodeforcesSync: [RSS Tier 2] Attempt ${i + 1}/${feedUrls.length} — ${feedUrl}`
      );
      const res = await fetch(feedUrl, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        console.warn(
          `CodeforcesSync: [RSS Tier 2] HTTP ${res.status} from ${feedUrl}`
        );
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("xml") && !contentType.includes("atom")) {
        console.warn(
          `CodeforcesSync: [RSS Tier 2] Unexpected Content-Type: ${contentType}`
        );
        continue;
      }

      const xmlText = await res.text();
      if (!xmlText || xmlText.length < 100) {
        console.warn(
          `CodeforcesSync: [RSS Tier 2] Empty or too-short response: ${xmlText.length} chars`
        );
        continue;
      }

      const submissions = parseRssFeed(xmlText);
      if (submissions.length > 0) {
        console.log(
          `CodeforcesSync: [RSS Tier 2] SUCCESS. Parsed ${submissions.length} submission(s).`
        );
        return submissions;
      }

      console.warn(
        `CodeforcesSync: [RSS Tier 2] Feed parsed but contains 0 accepted submissions.`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `CodeforcesSync: [RSS Tier 2] Fetch/parse error from ${feedUrl}: ${msg}`
      );
    }
  }

  return null;
}

export function isAcceptedSubmission(sub: Submission): boolean {
  return sub.verdict === "OK";
}

export function getProblemId(sub: Submission): string {
  const contestId = sub.contestId != null ? sub.contestId.toString() : "";
  return contestId ? `${contestId}${sub.problem.index}` : sub.problem.index;
}

export function createApiUrl(handle: string): string {
  return `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=30`;
}
