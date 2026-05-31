import { Request, Response } from "express";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";

/**
 * Voice Transcription Endpoint
 * Handles audio file uploads and transcription using Deepgram
 */

export async function handleVoiceTranscription(req: any, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const audioBuffer = (req.file as any).buffer;
    const mimeType = (req.file as any).mimetype;

    // Convert buffer to URL for transcription service
    // In production, you'd upload to S3 first
    const audioUrl = `data:${mimeType};base64,${audioBuffer.toString("base64")}`;

    const result = await transcribeAudio({
      audioUrl,
      language: "en",
    });

    res.json({
      transcript: (result as any).text || "",
    });
  } catch (error) {
    console.error("[Voice] Transcription error:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}

/**
 * AI Patient Response Endpoint
 * Generates AI patient responses based on user input
 */

export async function handleAIPatientResponse(req: Request, res: Response) {
  try {
    const { userInput, caseContext, conversationHistory } = req.body;

    if (!userInput || !caseContext) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const systemPrompt = `You are a simulated patient in a medical consultation. 
Your case: ${caseContext}

Respond naturally as a patient would, providing relevant symptoms and information based on the doctor's questions.
Keep responses concise (1-2 sentences) and realistic.
If asked about something not related to your case, politely redirect to your symptoms.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user" as const, content: userInput },
    ];

    const response = await invokeLLM({
      messages: messages as any,
    });

    const aiResponse = typeof response.choices[0]?.message?.content === "string" 
      ? response.choices[0]?.message?.content 
      : "";

    res.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AI Patient] Error generating response:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
}

/**
 * SCA Consultation Feedback Endpoint
 * Generates detailed feedback on the consultation
 */

export async function handleConsultationFeedback(req: Request, res: Response) {
  try {
    const { transcript, caseContext, domains } = req.body;

    if (!transcript || !caseContext) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const feedbackPrompt = `Analyze this medical consultation transcript and provide feedback.

Case: ${caseContext}

Transcript:
${transcript}

Provide feedback on:
1. History taking skills (0-100)
2. Clinical reasoning (0-100)
3. Communication skills (0-100)
4. Overall performance (0-100)

Format as JSON with scores and specific feedback for improvement.`;

    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: "You are an expert medical educator providing consultation feedback." },
        { role: "user" as const, content: feedbackPrompt },
      ] as any,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "consultation_feedback",
          strict: true,
          schema: {
            type: "object",
            properties: {
              history_taking: { type: "number" },
              clinical_reasoning: { type: "number" },
              communication: { type: "number" },
              overall_score: { type: "number" },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } },
              summary: { type: "string" },
            },
            required: ["history_taking", "clinical_reasoning", "communication", "overall_score", "strengths", "improvements", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const feedbackContent = response.choices[0]?.message?.content;
    const feedbackStr = typeof feedbackContent === "string" ? feedbackContent : "";
    const feedback = feedbackStr ? JSON.parse(feedbackStr) : {};

    res.json(feedback);
  } catch (error) {
    console.error("[Feedback] Error generating feedback:", error);
    res.status(500).json({ error: "Failed to generate feedback" });
  }
}
