import { PDFDocument, PDFPage, rgb } from "pdf-lib";

export interface ExamReportData {
  examName: string;
  userName: string;
  userEmail: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passMark: number;
  passed: boolean;
  duration: number;
  specialty: string;
  completedAt: Date;
  specialtyBreakdown: Array<{
    specialty: string;
    correct: number;
    total: number;
  }>;
  previousAttempts: Array<{
    date: string;
    score: number;
  }>;
  platformAverage: number;
}

export async function generateExamReportPDF(data: ExamReportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  // Colors
  const tealColor = rgb(0.1, 0.6, 0.6);
  const darkColor = rgb(0.1, 0.1, 0.1);
  const lightColor = rgb(0.95, 0.95, 0.95);
  const greenColor = rgb(0.2, 0.8, 0.2);
  const redColor = rgb(0.8, 0.2, 0.2);

  let yPosition = height - 40;

  // Header
  page.drawText("Question Grove 360", {
    x: 40,
    y: yPosition,
    size: 24,
    color: tealColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 30;
  page.drawText("Exam Report", {
    x: 40,
    y: yPosition,
    size: 14,
    color: darkColor,
    font: await pdfDoc.embedFont("Helvetica"),
  });

  yPosition -= 40;

  // User Info
  page.drawText(`Candidate: ${data.userName}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 20;
  page.drawText(`Email: ${data.userEmail}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 20;
  page.drawText(`Exam: ${data.examName}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 20;
  page.drawText(`Date: ${data.completedAt.toLocaleDateString()}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });

  yPosition -= 40;

  // Score Box
  const scoreBoxHeight = 80;
  page.drawRectangle({
    x: 40,
    y: yPosition - scoreBoxHeight,
    width: width - 80,
    height: scoreBoxHeight,
    borderColor: tealColor,
    borderWidth: 2,
    color: lightColor,
  });

  const scoreColor = data.passed ? greenColor : redColor;
  page.drawText(data.passed ? "PASSED" : "NOT PASSED", {
    x: 60,
    y: yPosition - 30,
    size: 14,
    color: scoreColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  page.drawText(`${data.score}/${data.totalQuestions}`, {
    x: width - 200,
    y: yPosition - 20,
    size: 32,
    color: tealColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  page.drawText(`${data.percentage}%`, {
    x: width - 200,
    y: yPosition - 50,
    size: 18,
    color: darkColor,
  });

  page.drawText(`Pass Mark: ${data.passMark}%`, {
    x: 60,
    y: yPosition - 50,
    size: 11,
    color: darkColor,
  });

  yPosition -= scoreBoxHeight + 30;

  // Performance Breakdown
  page.drawText("Performance by Specialty", {
    x: 40,
    y: yPosition,
    size: 12,
    color: darkColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 25;

  // Table Header
  page.drawText("Specialty", { x: 40, y: yPosition, size: 10, color: darkColor });
  page.drawText("Correct", { x: 250, y: yPosition, size: 10, color: darkColor });
  page.drawText("Total", { x: 350, y: yPosition, size: 10, color: darkColor });
  page.drawText("Percentage", { x: 450, y: yPosition, size: 10, color: darkColor });

  yPosition -= 20;

  // Table Rows
  data.specialtyBreakdown.forEach((item) => {
    const percentage = Math.round((item.correct / item.total) * 100);
    page.drawText(item.specialty, { x: 40, y: yPosition, size: 10, color: darkColor });
    page.drawText(item.correct.toString(), { x: 250, y: yPosition, size: 10, color: darkColor });
    page.drawText(item.total.toString(), { x: 350, y: yPosition, size: 10, color: darkColor });
    page.drawText(`${percentage}%`, { x: 450, y: yPosition, size: 10, color: darkColor });
    yPosition -= 18;
  });

  yPosition -= 20;

  // Comparison Section
  page.drawText("Performance Comparison", {
    x: 40,
    y: yPosition,
    size: 12,
    color: darkColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 25;

  page.drawText(`Your Score: ${data.percentage}%`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });

  yPosition -= 20;

  page.drawText(`Platform Average: ${data.platformAverage}%`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });

  yPosition -= 20;

  const difference = data.percentage - data.platformAverage;
  const differenceText = difference > 0 ? `+${difference}%` : `${difference}%`;
  const differenceColor = difference > 0 ? greenColor : redColor;

  page.drawText(`Difference: ${differenceText}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: differenceColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 40;

  // Previous Attempts
  if (data.previousAttempts.length > 0) {
    page.drawText("Previous Attempts", {
      x: 40,
      y: yPosition,
      size: 12,
      color: darkColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    yPosition -= 25;

    data.previousAttempts.slice(0, 5).forEach((attempt) => {
      page.drawText(`${attempt.date}: ${attempt.score}%`, {
        x: 40,
        y: yPosition,
        size: 10,
        color: darkColor,
      });
      yPosition -= 18;
    });
  }

  // Footer
  page.drawText("Generated by Question Grove 360 - Premium Medical Exam Preparation", {
    x: 40,
    y: 20,
    size: 9,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateConsultationReportPDF(data: {
  caseTitle: string;
  userName: string;
  userEmail: string;
  specialty: string;
  score: number;
  totalScore: number;
  percentage: number;
  domainScores: Record<string, number>;
  feedback: string;
  transcript: string;
  completedAt: Date;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const tealColor = rgb(0.1, 0.6, 0.6);
  const darkColor = rgb(0.1, 0.1, 0.1);
  const lightColor = rgb(0.95, 0.95, 0.95);

  let yPosition = height - 40;

  // Header
  page.drawText("Question Grove 360", {
    x: 40,
    y: yPosition,
    size: 24,
    color: tealColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 30;
  page.drawText("SCA Consultation Report", {
    x: 40,
    y: yPosition,
    size: 14,
    color: darkColor,
    font: await pdfDoc.embedFont("Helvetica"),
  });

  yPosition -= 40;

  // Case Info
  page.drawText(`Case: ${data.caseTitle}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 20;
  page.drawText(`Candidate: ${data.userName}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 20;
  page.drawText(`Specialty: ${data.specialty}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });
  yPosition -= 20;
  page.drawText(`Date: ${data.completedAt.toLocaleDateString()}`, {
    x: 40,
    y: yPosition,
    size: 11,
    color: darkColor,
  });

  yPosition -= 40;

  // Score
  page.drawRectangle({
    x: 40,
    y: yPosition - 60,
    width: width - 80,
    height: 60,
    borderColor: tealColor,
    borderWidth: 2,
    color: lightColor,
  });

  page.drawText(`Score: ${data.score}/${data.totalScore}`, {
    x: 60,
    y: yPosition - 30,
    size: 16,
    color: tealColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  page.drawText(`${data.percentage}%`, {
    x: width - 200,
    y: yPosition - 30,
    size: 24,
    color: tealColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 80;

  // Domain Scores
  page.drawText("Domain Scores", {
    x: 40,
    y: yPosition,
    size: 12,
    color: darkColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 25;

  Object.entries(data.domainScores).forEach(([domain, score]) => {
    page.drawText(`${domain}: ${score}%`, {
      x: 40,
      y: yPosition,
      size: 10,
      color: darkColor,
    });
    yPosition -= 18;
  });

  yPosition -= 20;

  // Feedback
  page.drawText("Feedback", {
    x: 40,
    y: yPosition,
    size: 12,
    color: darkColor,
    font: await pdfDoc.embedFont("Helvetica-Bold"),
  });

  yPosition -= 25;

  // Wrap feedback text
  const feedbackLines = data.feedback.split("\n");
  feedbackLines.forEach((line) => {
    if (yPosition < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = 750;
    }
    page.drawText(line, {
      x: 40,
      y: yPosition,
      size: 10,
      color: darkColor,
      maxWidth: width - 80,
    });
    yPosition -= 18;
  });

  // Footer
  page.drawText("Generated by Question Grove 360 - Premium Medical Exam Preparation", {
    x: 40,
    y: 20,
    size: 9,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
