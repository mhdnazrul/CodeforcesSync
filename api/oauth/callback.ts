import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  GITHUB_TOKEN_URL,
  GITHUB_USER_API_URL,
  isValidRedirectUri,
  decodeState,
  buildCallbackUrl,
} from "./_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state: brokerState, error: oauthError } = req.query;

  if (typeof brokerState !== "string") {
    return res.status(400).json({ error: "Missing state parameter" });
  }

  const decoded = decodeState(brokerState);
  if (!decoded) {
    return res.status(400).json({ error: "Invalid state format" });
  }

  const { extensionState, redirectUri, codeVerifier } = decoded;

  if (!isValidRedirectUri(redirectUri)) {
    return res.status(400).json({ error: "Invalid redirect_uri in state" });
  }

  if (oauthError) {
    const dest = `${redirectUri}?error=${encodeURIComponent(String(oauthError))}&state=${encodeURIComponent(extensionState)}`;
    return res.redirect(307, dest);
  }

  if (typeof code !== "string") {
    const dest = `${redirectUri}?error=${encodeURIComponent("missing_code")}&state=${encodeURIComponent(extensionState)}`;
    return res.redirect(307, dest);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "GitHub OAuth credentials not configured" });
  }

  let token: string;
  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: buildCallbackUrl(req),
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenData.access_token) {
      const desc = tokenData.error_description || tokenData.error || "token_exchange_failed";
      const dest = `${redirectUri}?error=${encodeURIComponent(desc)}&state=${encodeURIComponent(extensionState)}`;
      return res.redirect(307, dest);
    }

    token = tokenData.access_token;
  } catch {
    const dest = `${redirectUri}?error=${encodeURIComponent("token_exchange_network_error")}&state=${encodeURIComponent(extensionState)}`;
    return res.redirect(307, dest);
  }

  let username: string;
  try {
    const userRes = await fetch(GITHUB_USER_API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = (await userRes.json()) as { login?: string };
    username = userData.login || "unknown";
  } catch {
    username = "unknown";
  }

  const dest = `${redirectUri}?token=${encodeURIComponent(token)}&username=${encodeURIComponent(username)}&state=${encodeURIComponent(extensionState)}`;
  res.redirect(307, dest);
}
