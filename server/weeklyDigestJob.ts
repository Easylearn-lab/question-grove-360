import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getWeeklyDigestUsers, getTopicBreakdown } from "./db";

const SITE_URL = "https://questiongrove360.com";
const BRAND_COLOR = "#32CD32";

interface WeakTopic {
  specialty: string;
  topic: string;
  accuracy: number;
  total: number;
}

/**
 * Generate a simple unsubscribe token (base64 of userId).
 * For a low-risk preference toggle this is sufficient — no secrets needed.
 */
function generateUnsubscribeToken(userId: number): string {
  return Buffer.from(`digest_unsub_${userId}_${Date.now()}`).toString("base64url");
}

/**
 * Decode an unsubscribe token and extract the userId.
 */
export function decodeUnsubscribeToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const match = decoded.match(/^digest_unsub_(\d+)_\d+$/);
    if (!match) return null;
    return parseInt(match[1], 10);
  } catch {
    return null;
  }
}

/**
 * Find the 3 weakest topics for a user (min 3 attempts per topic for meaningful data).
 */
async function getWeakestTopics(userId: number): Promise<WeakTopic[]> {
  const breakdown = await getTopicBreakdown(userId, 90); // 90 days for more data
  if (!breakdown || breakdown.length === 0) return [];

  // Flatten all topics across specialties, filter min 3 attempts
  const allTopics: WeakTopic[] = [];
  for (const spec of breakdown) {
    for (const topic of spec.topics) {
      if (topic.total >= 3) {
        allTopics.push({
          specialty: spec.specialty,
          topic: topic.topic,
          accuracy: topic.accuracy,
          total: topic.total,
        });
      }
    }
  }

  // Sort by accuracy ascending (weakest first), take top 3
  allTopics.sort((a, b) => a.accuracy - b.accuracy);
  return allTopics.slice(0, 3);
}

/**
 * Build the HTML email for a user's weekly digest.
 */
export function buildDigestEmail(
  firstName: string,
  weakTopics: WeakTopic[],
  unsubscribeUrl: string
): string {
  const topicRows = weakTopics
    .map((t) => {
      const practiseUrl = `${SITE_URL}/questions?specialty=${encodeURIComponent(t.specialty)}&topic=${encodeURIComponent(t.topic)}`;
      const barWidth = Math.max(t.accuracy, 5); // min 5% for visibility
      const barColor = t.accuracy < 40 ? "#EF4444" : t.accuracy < 60 ? "#F59E0B" : BRAND_COLOR;
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 2px;">${t.specialty}</div>
            <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">
              <a href="${practiseUrl}" style="color: #1f2937; text-decoration: none;">${t.topic}</a>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; background: #f3f4f6; border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="width: ${barWidth}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 14px; font-weight: 600; color: ${barColor}; min-width: 40px; text-align: right;">${t.accuracy}%</span>
            </div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${t.total} questions attempted</div>
          </td>
        </tr>`;
    })
    .join("");

  const weakestTopicUrl =
    weakTopics.length > 0
      ? `${SITE_URL}/questions?specialty=${encodeURIComponent(weakTopics[0].specialty)}&topic=${encodeURIComponent(weakTopics[0].topic)}`
      : `${SITE_URL}/questions`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Progress</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: ${BRAND_COLOR}; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Question Grove 360</h1>
              <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Weekly Progress Digest</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 8px;">Hi ${firstName},</p>
              <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px; line-height: 1.5;">
                Here are your 3 weakest topics this week. A focused session on these will make the biggest difference to your exam readiness.
              </p>

              <!-- Weak Topics Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${topicRows}
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${weakestTopicUrl}" style="display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                      Start Practising
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #9ca3af; margin: 24px 0 0; text-align: center; line-height: 1.4;">
                Even 15 minutes on your weakest area compounds over time. You've got this.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px;">
                You're receiving this because you have an active subscription and have been practising recently.
              </p>
              <a href="${unsubscribeUrl}" style="font-size: 12px; color: #6b7280; text-decoration: underline;">
                Unsubscribe from weekly digest
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Heartbeat handler for the weekly digest cron job.
 * Mounted at POST /api/scheduled/weeklyDigest
 */
export async function weeklyDigestHandler(req: Request, res: Response) {
  try {
    // Authenticate — must be a cron callback
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log(`[WeeklyDigest] Cron triggered, taskUid=${user.taskUid}`);

    // Get eligible users
    const eligibleUsers = await getWeeklyDigestUsers();
    console.log(`[WeeklyDigest] Found ${eligibleUsers.length} eligible users`);

    if (eligibleUsers.length === 0) {
      return res.json({ ok: true, sent: 0, skipped: "no eligible users" });
    }

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const u of eligibleUsers) {
      try {
        // Get their 3 weakest topics
        const weakTopics = await getWeakestTopics(u.id);
        if (weakTopics.length === 0) {
          skipped++;
          continue;
        }

        const firstName = (u.name || "there").split(" ")[0];
        const unsubscribeToken = generateUnsubscribeToken(u.id);
        const unsubscribeUrl = `${SITE_URL}/api/unsubscribe/digest?token=${unsubscribeToken}`;

        const html = buildDigestEmail(firstName, weakTopics, unsubscribeUrl);

        // Send via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Question Grove 360 <noreply@questiongrove360.com>",
            to: u.email,
            subject: `Your weakest topics this week — ${firstName}`,
            html,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          errors.push(`User ${u.id}: ${response.status} ${errText}`);
        } else {
          sent++;
        }
      } catch (err: any) {
        errors.push(`User ${u.id}: ${err.message}`);
      }
    }

    console.log(`[WeeklyDigest] Done: sent=${sent}, skipped=${skipped}, errors=${errors.length}`);
    if (errors.length > 0) {
      console.error("[WeeklyDigest] Errors:", errors.slice(0, 5));
    }

    return res.json({ ok: true, sent, skipped, errors: errors.length });
  } catch (error: any) {
    console.error("[WeeklyDigest] Handler error:", error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      context: { url: req.url, taskUid: (error as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
