const ALLOWED_REDIRECT_PATTERNS = [
  /^chrome-extension:\/\/[a-p]{32}\/oauth-callback(\?.*)?$/,
  /^https:\/\/[a-p]{32}\.chromiumapp\.org\/oauth-callback(\?.*)?$/,
];

const STATE_SEPARATOR = "|";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_API_URL = "https://api.github.com/user";
const OAUTH_SCOPE = "repo";

function isValidRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_PATTERNS.some((p) => p.test(uri));
}

function encodeState(extensionState: string, redirectUri: string, codeVerifier: string): string {
  return extensionState + STATE_SEPARATOR + btoa(redirectUri) + STATE_SEPARATOR + btoa(codeVerifier);
}

function decodeState(encoded: string): { extensionState: string; redirectUri: string; codeVerifier: string } | null {
  const firstSep = encoded.indexOf(STATE_SEPARATOR);
  if (firstSep === -1) return null;
  const extensionState = encoded.slice(0, firstSep);
  const rest = encoded.slice(firstSep + 1);
  const secondSep = rest.indexOf(STATE_SEPARATOR);
  if (secondSep === -1) return null;
  try {
    const redirectUri = atob(rest.slice(0, secondSep));
    const codeVerifier = atob(rest.slice(secondSep + 1));
    return { extensionState, redirectUri, codeVerifier };
  } catch {
    return null;
  }
}

function buildCallbackUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const proto = Array.isArray(req.headers["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers["x-forwarded-proto"] || "https";
  const host = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}/api/oauth/callback`;
}

export {
  OAUTH_SCOPE,
  GITHUB_AUTH_URL,
  GITHUB_TOKEN_URL,
  GITHUB_USER_API_URL,
  isValidRedirectUri,
  encodeState,
  decodeState,
  buildCallbackUrl,
};
