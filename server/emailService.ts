import { storagePut } from './storage';
import { notifyOwner } from './_core/notification';

interface ExamReport {
  userId: number;
  userEmail: string;
  userName: string;
  examName: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  specialtyBreakdown: Record<string, number>;
  completedAt: Date;
  pdfUrl?: string;
}

interface ConsultationReport {
  userId: number;
  userEmail: string;
  userName: string;
  caseTitle: string;
  transcript: string;
  domainScores: Record<string, number>;
  feedback: string;
  completedAt: Date;
  pdfUrl?: string;
}

/**
 * Send exam report email with PDF attachment
 */
export async function sendExamReportEmail(report: ExamReport) {
  try {
    // Generate PDF report
    const pdfBuffer = await generateExamPDF(report) as Buffer;
    
    // Upload PDF to storage
    const { url: pdfUrl } = await storagePut(
      `reports/exam-${report.userId}-${Date.now()}.pdf`,
      pdfBuffer,
      'application/pdf'
    );

    // Prepare email content
    const emailContent = `
Dear ${report.userName},

Congratulations on completing the ${report.examName} mock exam!

**Your Results:**
- Score: ${report.score}/${report.totalQuestions}
- Accuracy: ${report.accuracy}%
- Completed: ${report.completedAt.toLocaleDateString()}

**Specialty Breakdown:**
${Object.entries(report.specialtyBreakdown)
  .map(([specialty, score]) => `- ${specialty}: ${score}%`)
  .join('\n')}

Your detailed report is attached. Review the areas where you need improvement and focus your study accordingly.

Best regards,
Question Grove 360 Team
    `;

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@questiongrove360.com',
        to: report.userEmail,
        subject: `Your ${report.examName} Results - ${report.accuracy}% Accuracy`,
        html: emailContent,
        attachments: [
          {
            filename: `exam-report-${report.examName}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return { success: true, pdfUrl };
  } catch (error) {
    console.error('Error sending exam report email:', error);
    throw error;
  }
}

/**
 * Send consultation report email with feedback
 */
export async function sendConsultationReportEmail(report: ConsultationReport) {
  try {
    // Generate PDF report
    const pdfBuffer = await generateConsultationPDF(report) as Buffer;
    
    // Upload PDF to storage
    const { url: pdfUrl } = await storagePut(
      `reports/consultation-${report.userId}-${Date.now()}.pdf`,
      pdfBuffer,
      'application/pdf'
    );

    // Prepare email content
    const emailContent = `
Dear ${report.userName},

Thank you for completing the SCA consultation simulation: ${report.caseTitle}

**Your Performance:**
${Object.entries(report.domainScores)
  .map(([domain, score]) => `- ${domain}: ${score}/10`)
  .join('\n')}

**Feedback:**
${report.feedback}

Your detailed report is attached. Use this feedback to improve your clinical skills and prepare for the actual exam.

Best regards,
Question Grove 360 Team
    `;

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@questiongrove360.com',
        to: report.userEmail,
        subject: `Your SCA Consultation Results - ${report.caseTitle}`,
        html: emailContent,
        attachments: [
          {
            filename: `consultation-report-${report.caseTitle}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return { success: true, pdfUrl };
  } catch (error) {
    console.error('Error sending consultation report email:', error);
    throw error;
  }
}

/**
 * Generate exam PDF report using pdf-lib
 */
async function generateExamPDF(report: ExamReport): Promise<Buffer> {
  const { PDFDocument, rgb, degrees } = await import('pdf-lib');
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { height } = page.getSize();
  
  let yPosition = height - 50;
  const margin = 50;
  const lineHeight = 20;
  
  // Title
  page.drawText('EXAM REPORT', {
    x: margin,
    y: yPosition,
    size: 24,
    color: rgb(0.1, 0.3, 0.8),
  });
  yPosition -= lineHeight * 2;
  
  // Header info
  const headerInfo = [
    `Exam: ${report.examName}`,
    `Date: ${report.completedAt.toLocaleDateString()}`,
    `User: ${report.userName}`,
  ];
  
  headerInfo.forEach((line) => {
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 11,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  });
  
  yPosition -= lineHeight;
  
  // Score section
  page.drawText('RESULTS', {
    x: margin,
    y: yPosition,
    size: 14,
    color: rgb(0.1, 0.3, 0.8),
  });
  yPosition -= lineHeight * 1.5;
  
  const scoreColor = report.accuracy >= 70 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0);
  page.drawText(`Score: ${report.score}/${report.totalQuestions}`, {
    x: margin,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight;
  
  page.drawText(`Accuracy: ${report.accuracy}%`, {
    x: margin,
    y: yPosition,
    size: 12,
    color: scoreColor,
  });
  yPosition -= lineHeight * 2;
  
  // Specialty breakdown
  page.drawText('SPECIALTY BREAKDOWN', {
    x: margin,
    y: yPosition,
    size: 14,
    color: rgb(0.1, 0.3, 0.8),
  });
  yPosition -= lineHeight * 1.5;
  
  Object.entries(report.specialtyBreakdown).forEach(([specialty, score]) => {
    page.drawText(`${specialty}: ${score}%`, {
      x: margin + 20,
      y: yPosition,
      size: 11,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  });
  
  yPosition -= lineHeight;
  
  // Footer
  page.drawText('Generated by Question Grove 360', {
    x: margin,
    y: 30,
    size: 9,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate consultation PDF report using pdf-lib
 */
async function generateConsultationPDF(report: ConsultationReport): Promise<Buffer> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  
  let yPosition = height - 50;
  const margin = 50;
  const lineHeight = 18;
  
  // Title
  page.drawText('CONSULTATION REPORT', {
    x: margin,
    y: yPosition,
    size: 24,
    color: rgb(0.1, 0.3, 0.8),
  });
  yPosition -= lineHeight * 2;
  
  // Header
  const headerInfo = [
    `Case: ${report.caseTitle}`,
    `Date: ${report.completedAt.toLocaleDateString()}`,
    `User: ${report.userName}`,
  ];
  
  headerInfo.forEach((line) => {
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 11,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  });
  
  yPosition -= lineHeight;
  
  // Domain scores
  page.drawText('DOMAIN SCORES', {
    x: margin,
    y: yPosition,
    size: 14,
    color: rgb(0.1, 0.3, 0.8),
  });
  yPosition -= lineHeight * 1.5;
  
  Object.entries(report.domainScores).forEach(([domain, score]) => {
    page.drawText(`${domain}: ${score}/10`, {
      x: margin + 20,
      y: yPosition,
      size: 11,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  });
  
  yPosition -= lineHeight;
  
  // Feedback
  page.drawText('FEEDBACK', {
    x: margin,
    y: yPosition,
    size: 14,
    color: rgb(0.1, 0.3, 0.8),
  });
  yPosition -= lineHeight * 1.5;
  
  const feedbackLines = report.feedback.split('\n');
  feedbackLines.forEach((line) => {
    if (yPosition < 100) {
      // Create new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = 750;
    }
    page.drawText(line.substring(0, 80), {
      x: margin + 20,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  });
  
  // Footer
  page.drawText('Generated by Question Grove 360', {
    x: margin,
    y: 30,
    size: 9,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Schedule email report to be sent (for async processing)
 */
export async function scheduleEmailReport(
  type: 'exam' | 'consultation',
  report: ExamReport | ConsultationReport,
  delayMs: number = 0
) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        if (type === 'exam') {
          const result = await sendExamReportEmail(report as ExamReport);
          resolve(result);
        } else {
          const result = await sendConsultationReportEmail(report as ConsultationReport);
          resolve(result);
        }
      } catch (error) {
        console.error(`Failed to send ${type} report email:`, error);
        resolve({ success: false, error });
      }
    }, delayMs);
  });
}

// ============================================================
// Email Trigger System (Owner Notifications)
// ============================================================

export type EmailTriggerType =
  | "welcome"
  | "study_reminder"
  | "exam_result"
  | "subscription_activated"
  | "subscription_expiring"
  | "weekly_progress";

interface EmailTriggerPayload {
  type: EmailTriggerType;
  userId: number;
  userName?: string;
  data?: Record<string, any>;
}

/**
 * Trigger an owner notification based on the event type.
 * Returns true if the notification was sent successfully.
 */
export async function triggerEmailNotification(payload: EmailTriggerPayload): Promise<boolean> {
  const { type, userName = "Unknown User", data } = payload;

  let title: string;
  let content: string;

  switch (type) {
    case "welcome":
      title = `New User Registration: ${userName}`;
      content = `A new user "${userName}" has registered on Question Grove 360.\n\nTimestamp: ${new Date().toISOString()}`;
      break;
    case "study_reminder":
      title = `Study Reminder Alert: ${userName}`;
      content = `User "${userName}" hasn't studied in a while.\nCurrent streak: ${data?.streak || 0} days\nLast active: ${data?.lastActive || "Unknown"}`;
      break;
    case "exam_result":
      title = `Exam Result: ${userName} - ${data?.passed ? "PASSED" : "FAILED"}`;
      content = `User "${userName}" completed "${data?.examName || "Mock Exam"}".\nScore: ${data?.score || 0}/${data?.totalQuestions || 0} (${Math.round(((data?.score || 0) / (data?.totalQuestions || 1)) * 100)}%)\nResult: ${data?.passed ? "PASSED" : "FAILED"}`;
      break;
    case "subscription_activated":
      title = `Subscription Activated: ${userName}`;
      content = `User "${userName}" has activated a ${data?.plan || "Premium"} subscription.\nTimestamp: ${new Date().toISOString()}`;
      break;
    case "subscription_expiring":
      title = `Subscription Expiring: ${userName}`;
      content = `User "${userName}"'s subscription is expiring soon.\nExpires at: ${data?.expiresAt || "Unknown"}`;
      break;
    case "weekly_progress":
      title = `Weekly Progress: ${userName}`;
      content = `Questions answered: ${data?.questionsAnswered || 0}\nCorrect rate: ${data?.correctRate || 0}%\nStudy hours: ${data?.studyHours || 0}`;
      break;
    default:
      console.warn(`[EmailService] Unknown trigger type: ${type}`);
      return false;
  }

  try {
    const result = await notifyOwner({ title, content });
    console.log(`[EmailService] Notification ${result ? "sent" : "failed"}: ${type} for user ${payload.userId}`);
    return result;
  } catch (error) {
    console.error(`[EmailService] Error sending notification:`, error);
    return false;
  }
}

/**
 * Trigger a welcome notification when a new user registers.
 */
export async function triggerWelcomeNotification(userId: number, userName: string): Promise<boolean> {
  return triggerEmailNotification({ type: "welcome", userId, userName });
}

/**
 * Trigger an exam result notification.
 */
export async function triggerExamResultNotification(
  userId: number,
  userName: string,
  examName: string,
  score: number,
  totalQuestions: number,
  passed: boolean
): Promise<boolean> {
  return triggerEmailNotification({
    type: "exam_result",
    userId,
    userName,
    data: { examName, score, totalQuestions, passed },
  });
}

/**
 * Trigger a subscription activation notification.
 */
export async function triggerSubscriptionNotification(
  userId: number,
  userName: string,
  plan: string
): Promise<boolean> {
  return triggerEmailNotification({
    type: "subscription_activated",
    userId,
    userName,
    data: { plan },
  });
}
