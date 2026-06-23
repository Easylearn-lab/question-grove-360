const NICE_GUIDELINES: Record<string, string> = {
  "Cardiovascular": "NG136, NG185, NG196",
  "Respiratory": "NG80, NG115",
  "Gastroenterology": "NG1, NG12, NG87",
  "Neurology": "NG128, NG50",
  "Paediatrics": "NG143, NG51, NG224",
  "Dermatology": "NG153, NG35",
  "Musculoskeletal": "NG226, NG177, NG100",
  "Endocrinology": "NG28, NG17",
  "Renal & Urology": "NG203, NG111",
  "Obstetrics & Gynaecology": "NG133, NG194",
  "Ophthalmology & ENT": "NG81",
  "Haematology": "NG241",
  "Pharmacology & Prescribing": "BNF/MHRA",
  "Ethics & Organisational": "GMC Good Medical Practice 2024",
  "General Practice": "NG12",
  "Statistics & EBM": "NICE evidence standards",
  "Infectious Disease": "NICE antimicrobial guidance",
};

interface MockEmailData {
  userEmail: string;
  userName: string;
  mockName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  timeTaken: number;
  specialtyBreakdown: Record<string, { correct: number; total: number; percentage: number }>;
  resultId: number;
}

export async function sendMockExamEmail(data: MockEmailData) {
  const { userEmail, userName, mockName, score, totalQuestions, percentage, passed, timeTaken, specialtyBreakdown, resultId } = data;

  // Sort specialties worst to best
  const sortedSpecialties = Object.entries(specialtyBreakdown)
    .sort(([, a], [, b]) => a.percentage - b.percentage);

  // Get 3 weakest specialties for focus areas
  const focusAreas = sortedSpecialties.slice(0, 3);

  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const timeStr = `${minutes}m ${seconds}s`;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const specialtyRows = sortedSpecialties.map(([specialty, data]) => {
    const color = data.percentage >= 70 ? '#32CD32' : data.percentage >= 50 ? '#FFA500' : '#FF4444';
    return `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${specialty}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${data.correct}/${data.total}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center; color: ${color}; font-weight: bold;">${data.percentage}%</td>
    </tr>`;
  }).join('');

  const focusAreasHtml = focusAreas.map(([specialty, data]) => {
    const guidelines = NICE_GUIDELINES[specialty] || 'Review relevant guidelines';
    return `<li style="margin-bottom: 8px;"><strong>${specialty}</strong> (${data.percentage}%) — review ${guidelines}</li>`;
  }).join('');

  const reviewUrl = `https://questgrove-ghmhikmd.manus.space/mock-review/${resultId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1A1A1A; margin: 0; font-size: 24px;">🏥 Question Grove 360</h1>
      <p style="color: #666; margin-top: 4px;">MRCGP AKT Mock Exam Results</p>
    </div>

    <div style="background: ${passed ? '#f0fff0' : '#fff0f0'}; border: 2px solid ${passed ? '#32CD32' : '#FF4444'}; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: ${passed ? '#32CD32' : '#FF4444'}; font-size: 28px;">${passed ? 'PASS ✅' : 'FAIL ❌'}</h2>
      <p style="margin: 8px 0 0; font-size: 18px; color: #333;"><strong>${score}/${totalQuestions}</strong> (${percentage.toFixed(1)}%)</p>
    </div>

    <table style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px;"><strong>Mock:</strong> ${mockName}</td>
        <td style="padding: 8px;"><strong>Date:</strong> ${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px;"><strong>Time:</strong> ${timeStr}</td>
        <td style="padding: 8px;"><strong>Pass Mark:</strong> 70%</td>
      </tr>
    </table>

    <h3 style="color: #1A1A1A; border-bottom: 2px solid #32CD32; padding-bottom: 8px;">Specialty Breakdown</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px 12px; text-align: left;">Specialty</th>
          <th style="padding: 8px 12px; text-align: center;">Score</th>
          <th style="padding: 8px 12px; text-align: center;">Accuracy</th>
        </tr>
      </thead>
      <tbody>${specialtyRows}</tbody>
    </table>

    <h3 style="color: #1A1A1A; border-bottom: 2px solid #FFA500; padding-bottom: 8px;">📌 Focus Areas</h3>
    <ul style="margin-bottom: 24px; padding-left: 20px;">${focusAreasHtml}</ul>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${reviewUrl}" style="display: inline-block; background: #32CD32; color: #1A1A1A; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 Review Questions</a>
    </div>

    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 32px;">
      Question Grove 360 — Your MRCGP AKT Preparation Partner
    </p>
  </div>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Question Grove 360 <noreply@questiongrove360.com>',
      to: userEmail,
      subject: `Your MRCGP AKT Mock Results — ${mockName} — ${date}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[MockEmail] Failed to send:', errorText);
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  return { success: true };
}
