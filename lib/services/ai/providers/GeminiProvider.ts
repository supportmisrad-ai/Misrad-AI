import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'buffer';
import { AIProviderError } from '../errors';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

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
    type GenerateContentParams = Parameters<typeof ai.models.generateContent>[0];
    type GenerateContentParamsWithSignal = GenerateContentParams & { signal?: AbortSignal };

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const base64 = Buffer.from(params.audioBuffer).toString('base64');

      const request: GenerateContentParamsWithSignal = {
        model: params.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64,
                  mimeType: params.mimeType,
                },
              },
              {
                text: 'תמלל במדויק את ההקלטה לעברית כפי שנאמר (As-is). אל תוסיף סיכומים ואל תתקן תוכן. החזר טקסט תמלול בלבד.',
              },
            ],
          },
        ],
        signal: ac.signal,
      };

      const response = await ai.models.generateContent(request);

      return { text: response.text || '' };
    } catch (err: unknown) {
      const obj = asObject(err) ?? {};
      const responseObj = asObject(obj.response);
      const status =
        typeof obj.status === 'number'
          ? obj.status
          : typeof responseObj?.status === 'number'
            ? responseObj.status
            : undefined;
      throw new AIProviderError({ provider: 'google', status, message: getErrorMessage(err) || 'Gemini request failed', cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateJson(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    responseSchema?: unknown;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    type GenerateContentParams = Parameters<typeof ai.models.generateContent>[0];
    type GenerateContentParamsWithSignal = GenerateContentParams & { signal?: AbortSignal };

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const request: GenerateContentParamsWithSignal = {
        model: params.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: params.prompt }],
          },
        ],
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        },
        signal: ac.signal,
      };

      const response = await ai.models.generateContent(request);

      return { text: response.text || '' };
    } catch (err: unknown) {
      const obj = asObject(err) ?? {};
      const responseObj = asObject(obj.response);
      const status =
        typeof obj.status === 'number'
          ? obj.status
          : typeof responseObj?.status === 'number'
            ? responseObj.status
            : undefined;
      throw new AIProviderError({ provider: 'google', status, message: getErrorMessage(err) || 'Gemini request failed', cause: err });
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
    type GenerateContentParams = Parameters<typeof ai.models.generateContent>[0];
    type GenerateContentParamsWithSignal = GenerateContentParams & { signal?: AbortSignal };

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const request: GenerateContentParamsWithSignal = {
        model: params.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: params.prompt }],
          },
        ],
        config: {
          systemInstruction: params.systemInstruction,
        },
        signal: ac.signal,
      };

      const response = await ai.models.generateContent(request);

      return { text: response.text || '' };
    } catch (err: unknown) {
      const obj = asObject(err) ?? {};
      const responseObj = asObject(obj.response);
      const status =
        typeof obj.status === 'number'
          ? obj.status
          : typeof responseObj?.status === 'number'
            ? responseObj.status
            : undefined;
      throw new AIProviderError({ provider: 'google', status, message: getErrorMessage(err) || 'Gemini request failed', cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }
}
