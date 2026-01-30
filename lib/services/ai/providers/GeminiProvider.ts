import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'buffer';
import { AIProviderError } from '../errors';

export class GeminiProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(params: {
    model: string;
    audioBuffer: ArrayBuffer;
    mimeType: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const base64 = Buffer.from(params.audioBuffer).toString('base64');

      const response = await ai.models.generateContent({
        model: params.model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64,
                mimeType: params.mimeType,
              },
            } as any,
            {
              text: 'תמלל במדויק את ההקלטה לעברית כפי שנאמר (As-is). אל תוסיף סיכומים ואל תתקן תוכן. החזר טקסט תמלול בלבד.',
            },
          ],
        },
        signal: ac.signal as any,
      } as any);

      return { text: response.text || '' };
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : typeof err?.response?.status === 'number' ? err.response.status : undefined;
      throw new AIProviderError({ provider: 'google', status, message: String(err?.message || err), cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateJson(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    responseSchema?: any;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const response = await ai.models.generateContent({
        model: params.model,
        contents: {
          parts: [{ text: params.prompt }],
        },
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        },
        signal: ac.signal as any,
      } as any);

      return { text: response.text || '' };
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : typeof err?.response?.status === 'number' ? err.response.status : undefined;
      throw new AIProviderError({ provider: 'google', status, message: String(err?.message || err), cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateText(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const response = await ai.models.generateContent({
        model: params.model,
        contents: params.prompt,
        config: {
          systemInstruction: params.systemInstruction,
        },
        signal: ac.signal as any,
      } as any);

      return { text: response.text || '' };
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : typeof err?.response?.status === 'number' ? err.response.status : undefined;
      throw new AIProviderError({ provider: 'google', status, message: String(err?.message || err), cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }
}
