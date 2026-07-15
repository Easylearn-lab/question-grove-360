import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse the OAuth state parameter to extract redirectUri and optional returnPath.
 * Supports two formats:
 * 1. Legacy: base64(redirectUri) — just the redirect URI string
 * 2. New: base64(JSON({ redirectUri, returnPath })) — with return path
 */
function parseState(state: string): { redirectUri: string; returnPath: string } {
  try {
    const decoded = atob(state);
    // Try to parse as JSON first (new format)
    try {
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === "object" && parsed.redirectUri) {
        return {
          redirectUri: parsed.redirectUri,
          returnPath: parsed.returnPath || "/dashboard",
        };
      }
    } catch {
      // Not JSON — legacy format (plain redirectUri string)
    }
    // Legacy format: decoded string is the redirectUri itself
    return { redirectUri: decoded, returnPath: "/dashboard" };
  } catch {
    return { redirectUri: "", returnPath: "/dashboard" };
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    console.log("[OAuth] Callback hit. code:", code ? "present" : "missing", "state:", state ? "present" : "missing");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Parse state to get returnPath for post-login redirect
    const { returnPath } = parseState(state);
    console.log("[OAuth] Parsed returnPath from state:", returnPath);

    try {
      console.log("[OAuth] Exchanging code for token...");
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchange successful");

      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] Got user info:", { openId: userInfo.openId, name: userInfo.name, email: userInfo.email });

      if (!userInfo.openId) {
        console.error("[OAuth] openId missing from user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Use email prefix or "User" as fallback if name is empty
      const displayName = userInfo.name || (userInfo.email ? userInfo.email.split("@")[0] : "User");

      await db.upsertUser({
        openId: userInfo.openId,
        name: displayName,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });
      console.log("[OAuth] User upserted successfully");

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });
      console.log("[OAuth] Session token created, length:", sessionToken.length);

      const cookieOptions = getSessionCookieOptions(req);
      console.log("[OAuth] Cookie options:", JSON.stringify(cookieOptions));

      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the returnPath from state (defaults to /dashboard)
      const safeReturnPath = returnPath.startsWith("/") ? returnPath : "/dashboard";
      console.log("[OAuth] Cookie set, redirecting to", safeReturnPath);
      res.redirect(302, safeReturnPath);
    } catch (error: any) {
      console.error("[OAuth] Callback FAILED:", error?.message || error);
      console.error("[OAuth] Error stack:", error?.stack);
      res.status(500).json({ error: "OAuth callback failed", details: error?.message });
    }
  });
}
