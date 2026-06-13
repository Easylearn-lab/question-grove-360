import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
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
      console.log("[OAuth] Cookie set, redirecting to /dashboard");
      res.redirect(302, "/dashboard");
    } catch (error: any) {
      console.error("[OAuth] Callback FAILED:", error?.message || error);
      console.error("[OAuth] Error stack:", error?.stack);
      res.status(500).json({ error: "OAuth callback failed", details: error?.message });
    }
  });
}
