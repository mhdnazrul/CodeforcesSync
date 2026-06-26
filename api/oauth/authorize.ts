import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  OAUTH_SCOPE,
  GITHUB_AUTH_URL,
  isValidRedirectUri,
  encodeState,
  buildCallbackUrl,
} from "./_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const {
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
    code_verifier,
  } = req.query;

  if (
    typeof redirect_uri !== "string" ||
    typeof state !== "string" ||
    typeof code_challenge !== "string" ||
    typeof code_verifier !== "string"
  ) {
    return res.status(400).json({ error: "Missing required parameters: redirect_uri, state, code_challenge, code_verifier" });
  }

  if (!isValidRedirectUri(redirect_uri)) {
    return res.status(400).json({ error: "Invalid redirect_uri" });
  }

  if (code_challenge_method !== "S256") {
    return res.status(400).json({ error: "Only S256 code_challenge_method is supported" });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GITHUB_CLIENT_ID not configured" });
  }

  const callbackUrl = buildCallbackUrl(req);
  const brokerState = encodeState(state, redirect_uri, code_verifier);

  const githubUrl =
    `${GITHUB_AUTH_URL}` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&scope=${OAUTH_SCOPE}` +
    `&state=${encodeURIComponent(brokerState)}` +
    `&code_challenge=${encodeURIComponent(code_challenge)}` +
    `&code_challenge_method=S256`;

  res.redirect(307, githubUrl);
}
