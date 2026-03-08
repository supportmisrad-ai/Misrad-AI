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
      console.log('[GeminiProvider.transcribe] Preparing request', {
        model: params.model,
        mimeType: params.mimeType,
        bufferSize: params.audioBuffer.byteLength,
        base64Length: base64.length,
      });

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
                text: 'Please transcribe this audio exactly as spoken in Hebrew. Return only the raw transcript text, no summaries or corrections.',
              },
            ],
          },
        ],
        signal: ac.signal,
      };

      const response = await ai.models.generateContent(request);
      const text = response.text || '';
      console.log('[GeminiProvider.transcribe] Response received', {
        textLength: text.length,
        textPreview: text.substring(0, 100),
        hasText: !!text,
      });

      return { text };
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

  async streamText(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ stream: ReadableStream<Uint8Array> }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const request = {
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
            };

            const response = await ai.models.generateContentStream(request);
            
            for await (const chunk of response) {
              const text = chunk.text || '';
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            
            clearTimeout(timeout);
            controller.close();
          } catch (err: unknown) {
            clearTimeout(timeout);
            controller.error(err);
          }
        },
        cancel() {
          clearTimeout(timeout);
          ac.abort();
        },
      });

      return { stream };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const obj = asObject(err) ?? {};
      const responseObj = asObject(obj.response);
      const status =
        typeof obj.status === 'number'
          ? obj.status
          : typeof responseObj?.status === 'number'
            ? responseObj.status
            : undefined;
      throw new AIProviderError({ provider: 'google', status, message: getErrorMessage(err) || 'Gemini streaming failed', cause: err });
    }
  }
}
