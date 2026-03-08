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
                text: 'תמלל את האודיו הזה בדיוק כפי שנאמר בעברית.\nאם יש יותר מדובר אחד, זהה את הדוברים השונים וסמן כל החלפת דובר בשורה חדשה עם תגית: "דובר 1:", "דובר 2:", וכו\'.\nאל תסכם, אל תתקן - רק תמלול מדויק עם זיהוי דוברים.',
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

  async generateImage(params: {
    prompt: string;
    model?: string;
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    timeoutMs: number;
  }): Promise<{ imageBase64: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    const modelName = params.model || 'gemini-3.1-flash-image-preview';
    const useNanoBanana = modelName.includes('flash-image') || modelName.includes('pro-image');

    // Convert size to aspect ratio for Nano Banana
    const getAspectRatio = (size?: string): string => {
      if (size === '1792x1024') return '16:9';
      if (size === '1024x1792') return '9:16';
      return '1:1';
    };

    try {
      if (useNanoBanana) {
        // Nano Banana (Gemini native image generation)
        const config: any = {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio: getAspectRatio(params.size),
          },
        };

        // Add image_size for high quality models
        if (modelName.includes('3.1-flash-image-preview') || modelName.includes('3-pro-image-preview')) {
          config.imageConfig.imageSize = '2K';
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.prompt,
          config,
        });

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('No image generated');
        }

        const parts = response.candidates[0]?.content?.parts;
        if (!parts || parts.length === 0) {
          throw new Error('No parts in response');
        }

        let imageBase64: string | null = null;
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            break;
          }
        }

        if (!imageBase64) {
          throw new Error('No image data in response');
        }

        return { imageBase64 };
      } else {
        // Imagen (legacy API)
        const response = await ai.models.generateImages({
          model: modelName,
          prompt: params.prompt,
          config: {
            numberOfImages: 1,
          },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
          throw new Error('No image generated');
        }

        const firstImage = response.generatedImages[0];
        const imageBytes = firstImage?.image?.imageBytes;
        if (!imageBytes) {
          throw new Error('No image bytes returned');
        }

        return { imageBase64: imageBytes };
      }
    } catch (err: unknown) {
      const obj = asObject(err) ?? {};
      const responseObj = asObject(obj.response);
      const status =
        typeof obj.status === 'number'
          ? obj.status
          : typeof responseObj?.status === 'number'
            ? responseObj.status
            : undefined;
      throw new AIProviderError({ provider: 'google', status, message: getErrorMessage(err) || 'Image generation failed', cause: err });
    } finally {
      clearTimeout(timeout);
    }
  }
}
