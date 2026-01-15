import { AIProviderError } from '../errors';

export class GroqProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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

  private async chat(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
    responseFormat?: any;
  }): Promise<{ text: string }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const body: any = {
        model: params.model,
        messages: [
          ...(params.systemInstruction ? [{ role: 'system', content: params.systemInstruction }] : []),
          { role: 'user', content: params.prompt },
        ],
      };

      if (params.responseFormat) {
        body.response_format = params.responseFormat;
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        throw new AIProviderError({ provider: 'groq', status: res.status, message: `Groq error (${res.status}): ${txt}` });
      }

      const json: any = await res.json();
      const text = json?.choices?.[0]?.message?.content;

      if (!text) {
        throw new AIProviderError({ provider: 'groq', message: 'Groq returned empty response' });
      }

      return { text };
    } catch (err: any) {
      if (String(err?.name || '') === 'AbortError') {
        throw new AIProviderError({
          provider: 'groq',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו לנתח בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
