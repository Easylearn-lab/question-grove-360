import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";

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
   * Text-to-speech synthesis using the built-in TTS service
   * Returns a URL to the generated audio file
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

      const baseUrl = ENV.forgeApiUrl.endsWith("/")
        ? ENV.forgeApiUrl
        : `${ENV.forgeApiUrl}/`;
      const fullUrl = new URL("v1/audio/speech", baseUrl).toString();

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: input.text,
          voice: input.voice,
          speed: input.speed,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `TTS service failed: ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`,
        });
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const key = `tts/${ctx.user.id}-${Date.now()}.mp3`;
      const { url } = await storagePut(key, audioBuffer, "audio/mpeg");

      return { url, key };
    }),
});
