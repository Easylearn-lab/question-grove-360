import type { Request, Response } from "express";
import { decodeUnsubscribeToken } from "./weeklyDigestJob";
import { setDigestUnsubscribed } from "./db";

const SITE_URL = "https://questiongrove360.com";
const BRAND_COLOR = "#32CD32";

/**
 * Handle GET /api/unsubscribe/digest?token=xxx
 * One-click unsubscribe from the weekly digest email.
 * Returns an HTML confirmation page.
 */
export async function unsubscribeDigestHandler(req: Request, res: Response) {
  const token = req.query.token as string | undefined;

  if (!token) {
    return res.status(400).send(buildUnsubscribePage(false, "Missing token."));
  }

  const userId = decodeUnsubscribeToken(token);
  if (!userId) {
    return res.status(400).send(buildUnsubscribePage(false, "Invalid or expired link."));
  }

  try {
    const success = await setDigestUnsubscribed(userId, true);
    if (!success) {
      return res.status(500).send(buildUnsubscribePage(false, "Something went wrong. Please try again."));
    }

    console.log(`[Unsubscribe] User ${userId} unsubscribed from weekly digest`);
    return res.send(buildUnsubscribePage(true));
  } catch (error) {
    console.error("[Unsubscribe] Error:", error);
    return res.status(500).send(buildUnsubscribePage(false, "Something went wrong. Please try again."));
  }
}

function buildUnsubscribePage(success: boolean, errorMessage?: string): string {
  const title = success ? "Unsubscribed" : "Error";
  const heading = success
    ? "You've been unsubscribed"
    : "Couldn't unsubscribe";
  const body = success
    ? "You won't receive the weekly progress digest any more. You can re-subscribe from your account settings at any time."
    : errorMessage || "Something went wrong.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Question Grove 360</title>
  <style>
    body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 420px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #1f2937; margin: 0 0 12px; }
    p { font-size: 15px; color: #6b7280; line-height: 1.5; margin: 0 0 24px; }
    a.btn { display: inline-block; background: ${BRAND_COLOR}; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✓" : "⚠"}</div>
    <h1>${heading}</h1>
    <p>${body}</p>
    <a class="btn" href="${SITE_URL}">Back to Question Grove 360</a>
  </div>
</body>
</html>`;
}
