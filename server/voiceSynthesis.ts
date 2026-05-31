import { storagePut } from './storage';

interface VoiceSynthesisOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

/**
 * Synthesize text to speech using ElevenLabs API
 */
export async function synthesizeVoice(options: VoiceSynthesisOptions): Promise<string> {
  const {
    text,
    voiceId = 'EXAVITQu4vr4xnSDxMaL', // Default male voice
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Upload audio to storage
    const { url } = await storagePut(
      `voice/synthesis-${Date.now()}.mp3`,
      Buffer.from(audioBuffer),
      'audio/mpeg'
    );

    return url;
  } catch (error) {
    console.error('Voice synthesis error:', error);
    throw error;
  }
}

/**
 * Get available ElevenLabs voices
 */
export async function getAvailableVoices(): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json() as { voices: Array<{ voice_id: string; name: string }> };
    return data.voices.map(v => ({
      id: v.voice_id,
      name: v.name,
    }));
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
}

/**
 * Create a voice preset for SCA patient roleplay
 */
export async function createPatientVoicePreset(
  patientType: 'male' | 'female' | 'elderly'
): Promise<string> {
  const voicePresets: Record<string, string> = {
    male: 'EXAVITQu4vr4xnSDxMaL',
    female: '21m00Tcm4TlvDq8ikWAM',
    elderly: 'AZnzlk1XvdBFFXlQrKQI',
  };

  return voicePresets[patientType] || voicePresets.male;
}

/**
 * Stream voice synthesis for real-time SCA consultation
 */
export async function streamVoiceSynthesis(
  text: string,
  voiceId: string = 'EXAVITQu4vr4xnSDxMaL'
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs streaming error: ${response.statusText}`);
  }

  return response.body as ReadableStream<Uint8Array>;
}

/**
 * Generate SCA patient response with voice
 */
export async function generatePatientResponse(
  patientContext: string,
  userStatement: string,
  patientType: 'male' | 'female' | 'elderly' = 'male'
): Promise<{ text: string; audioUrl: string }> {
  // Generate response text using Claude (would be implemented in a separate function)
  const responseText = `Patient response to: "${userStatement}"`;

  // Get appropriate voice for patient type
  const voiceId = await createPatientVoicePreset(patientType);

  // Synthesize response to speech
  const audioUrl = await synthesizeVoice({
    text: responseText,
    voiceId,
  });

  return {
    text: responseText,
    audioUrl,
  };
}
