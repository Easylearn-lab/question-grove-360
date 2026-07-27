import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";

/**
 * Map OpenAI-style voice names to ElevenLabs voice IDs.
 * These are carefully chosen to match the patient demographics:
 * - shimmer → Sarah (mature female, reassuring) — older female patients
 * - nova → Alice (clear, engaging) — younger female patients
 * - onyx → George (warm, captivating) — older male patients
 * - echo → Liam (energetic) — younger male patients
 * - alloy → River (relaxed, neutral) — gender-neutral/default
 */
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  shimmer: "EXAVITQu4vr4xnSDxMaL", // Sarah - Mature, Reassuring
  nova: "Xb7hH8MSUJpSbSDYk0k2",    // Alice - Clear, Engaging
  onyx: "JBFqnCBsd6RMkjVDRZzb",    // George - Warm, Captivating
  echo: "TX3LPaxmHKxFdv7VOQHJ",    // Liam - Energetic
  alloy: "SAz9YHcvj6GT2YYXdXww",   // River - Relaxed, Neutral
  fable: "pFZP5JQG7iQjIQuC4Bku",   // Adam - Dominant, Firm (fallback)
};

export const voiceRouter = router({
  /**
   * Transcribe audio from a URL (after frontend uploads to storage)
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string(),
        language: z.string().optional().default("en"),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: input.prompt || "Transcribe this medical consultation recording",
      });

      // Check if it's an error
      if ("error" in result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (result as any).error,
          cause: result,
        });
      }

      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
      };
    }),

  /**
   * Upload audio blob and get a storage URL for transcription
   */
  uploadAudio: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");

      // Check size (16MB limit)
      const sizeMB = buffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Audio file too large (${sizeMB.toFixed(1)}MB). Maximum is 16MB.`,
        });
      }

      const ext = input.mimeType.split("/")[1] || "webm";
      const key = `voice/${ctx.user.id}-${Date.now()}.${ext}`;

      const { url } = await storagePut(key, buffer, input.mimeType);

      return { url, key };
    }),

  /**
   * Generate AI patient response for SCA consultation
   */
  generatePatientResponse: protectedProcedure
    .input(
      z.object({
        caseScenario: z.string(),
        userMessage: z.string(),
        conversationHistory: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      
      const systemPrompt = `You are a patient in a medical consultation for the following scenario:
${input.caseScenario}

Respond naturally as a patient would, providing relevant information about your symptoms, medical history, and concerns. Keep responses concise (1-2 sentences) and realistic. Ask clarifying questions if the doctor's questions are unclear.`;
      
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.conversationHistory || []),
        { role: "user" as const, content: input.userMessage },
      ];
      
      const response = await invokeLLM({
        messages: messages as any,
      });
      
      const patientResponse = response.choices[0]?.message?.content || "I'm not sure I understand. Could you rephrase that?";
      
      return {
        response: patientResponse,
      };
    }),

  /**
   * Text-to-speech synthesis using ElevenLabs API with robust error handling.
   * Returns a URL to the generated audio file stored in S3.
   * On failure, returns a structured error with fallback indicator so the frontend
   * can switch to Web Speech API (Tier 2) or text-only (Tier 3).
   */
  synthesize: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(4096),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
        speed: z.number().min(0.25).max(4.0).default(1.0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ENV } = await import("./_core/env");

      if (!ENV.elevenLabsApiKey) {
        console.error(`[TTS] ${new Date().toISOString()} ElevenLabs API key not configured — fallback required`);
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "TTS_FALLBACK_REQUIRED:API key not configured",
        });
      }

      // Map the OpenAI-style voice name to an ElevenLabs voice ID
      const elevenLabsVoiceId = ELEVENLABS_VOICE_MAP[input.voice] || ELEVENLABS_VOICE_MAP["alloy"];

      // Use AbortController for 4-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const startTime = Date.now();
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ENV.elevenLabsApiKey,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
              text: input.text,
              model_id: "eleven_flash_v2_5",
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true,
                speed: Math.max(0.7, Math.min(1.2, input.speed)),
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          console.error(`[TTS] ${new Date().toISOString()} ElevenLabs error: ${response.status} ${errorText} (latency: ${latencyMs}ms)`);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `TTS_FALLBACK_REQUIRED:ElevenLabs ${response.status} - ${response.statusText}`,
          });
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer());
        const key = `tts/${ctx.user.id}-${Date.now()}.mp3`;
        const { url } = await storagePut(key, audioBuffer, "audio/mpeg");

        console.log(`[TTS] ${new Date().toISOString()} ElevenLabs success: ${audioBuffer.length} bytes, ${latencyMs}ms latency`);

        return { url, key, tier: "elevenlabs" as const, latencyMs };
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        // If it's already a TRPCError, rethrow
        if (err.code === "PRECONDITION_FAILED") throw err;

        // Timeout or network error
        const reason = err.name === "AbortError" 
          ? "Network timeout (>4s)" 
          : err.message || "Unknown error";
        
        console.error(`[TTS] ${new Date().toISOString()} ElevenLabs failure: ${reason}`);
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `TTS_FALLBACK_REQUIRED:${reason}`,
        });
      }
    }),
});
