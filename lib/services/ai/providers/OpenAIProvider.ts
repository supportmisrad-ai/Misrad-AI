import { AIProviderError } from '../errors';
import { z } from 'zod';

import { asObject } from '@/lib/shared/unknown';
const OpenAIEmbeddingsResponseSchema = z
  .object({
    data: z.array(
      z
        .object({
          embedding: z.array(z.number()),
        })
        .passthrough()
    ),
  })
  .passthrough();

const OpenAIChatCompletionResponseSchema = z
  .object({
    choices: z.array(
      z
        .object({
          message: z
            .object({
              content: z.string().nullable().optional(),
            })
            .passthrough(),
        })
        .passthrough()
    ),
  })
  .passthrough();

type OpenAIResponseFormat = { type: 'json_object' };

function isAbortError(err: unknown): boolean {
  const obj = asObject(err);
  const name = err instanceof Error ? err.name : typeof obj?.name === 'string' ? obj.name : '';
  return name === 'AbortError';
}

export class OpenAIProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embedText(params: { model: string; input: string; timeoutMs: number }): Promise<{ embedding: number[] }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          input: params.input,
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'openai', status: res.status, message: `OpenAI embeddings error (${res.status}): ${txt}` });
      }

      const json: unknown = await res.json();
      const parsed = OpenAIEmbeddingsResponseSchema.safeParse(json);
      const embedding = parsed.success ? parsed.data.data?.[0]?.embedding : null;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new AIProviderError({ provider: 'openai', message: 'OpenAI embeddings returned empty vector' });
      }

      return { embedding };
    } catch (err: unknown) {
      if (isAbortError(err)) {
        throw new AIProviderError({
          provider: 'openai',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו ליצור Embedding בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err;
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
    return this.chat({
      model: params.model,
      prompt: params.prompt,
      systemInstruction: params.systemInstruction,
      timeoutMs: params.timeoutMs,
      responseFormat: undefined,
    });
  }

  async generateJson(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    return this.chat({
      model: params.model,
      prompt: params.prompt,
      systemInstruction: params.systemInstruction,
      timeoutMs: params.timeoutMs,
      responseFormat: { type: 'json_object' },
    });
  }

  async generateVisionJson(params: {
    model: string;
    prompt: string;
    imageDataUrl: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: params.model,
        messages: [
          ...(params.systemInstruction ? [{ role: 'system', content: params.systemInstruction }] : []),
          {
            role: 'user',
            content: [
              { type: 'text', text: params.prompt },
              { type: 'image_url', image_url: { url: params.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'openai', status: res.status, message: `OpenAI error (${res.status}): ${txt}` });
      }

      const json: unknown = await res.json();
      const parsed = OpenAIChatCompletionResponseSchema.safeParse(json);
      const text = parsed.success ? parsed.data.choices?.[0]?.message?.content : null;

      if (!text) {
        throw new AIProviderError({ provider: 'openai', message: 'OpenAI returned empty response' });
      }

      return { text };
    } catch (err: unknown) {
      if (isAbortError(err)) {
        throw new AIProviderError({
          provider: 'openai',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו לבצע זיהוי תמונה בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async chat(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
    responseFormat?: OpenAIResponseFormat;
  }): Promise<{ text: string }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: params.model,
        messages: [
          ...(params.systemInstruction ? [{ role: 'system', content: params.systemInstruction }] : []),
          { role: 'user', content: params.prompt },
        ],
      };

      if (params.responseFormat) {
        body.response_format = params.responseFormat;
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'openai', status: res.status, message: `OpenAI error (${res.status}): ${txt}` });
      }

      const json: unknown = await res.json();
      const parsed = OpenAIChatCompletionResponseSchema.safeParse(json);
      const text = parsed.success ? parsed.data.choices?.[0]?.message?.content : null;

      if (!text) {
        throw new AIProviderError({ provider: 'openai', message: 'OpenAI returned empty response' });
      }

      return { text };
    } finally {
      clearTimeout(timeout);
    }
  }
}
