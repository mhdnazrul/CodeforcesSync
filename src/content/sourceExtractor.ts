export function extractSourceCode(): string | null {
  const selectors = [
    "#program-source-text",
    ".program-source",
    "pre.prettyprint",
    ".source-code",
    "#sourceCode",
    "div.source-code pre",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el && el.innerText && el.innerText.trim().length > 20) {
      console.log(`CodeforcesSync (Tab): Found via "${selector}"`);
      return el.innerText;
    }
  }

  const pres = Array.from(document.getElementsByTagName("pre"));
  if (pres.length > 0) {
    const largest = pres.reduce((a, b) =>
      (a.innerText?.length || 0) > (b.innerText?.length || 0) ? a : b,
    );
    if (largest && largest.innerText && largest.innerText.trim().length > 100) {
      console.log("CodeforcesSync (Tab): Found via largest <pre>");
      return largest.innerText;
    }
  }

  return null;
}
