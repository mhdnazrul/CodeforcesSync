export interface InjectedFetchResult {
  ok: boolean;
  status: number;
  body: unknown;
  isHtml: boolean;
  error?: string;
}

export async function fetchSubmissions(url: string): Promise<InjectedFetchResult> {
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
}
