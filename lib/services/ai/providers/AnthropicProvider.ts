import { AIProviderError } from '../errors';

export class AnthropicProvider {
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
    return this.messages({
      model: params.model,
      prompt: params.prompt,
      systemInstruction: params.systemInstruction,
      timeoutMs: params.timeoutMs,
    });
  }

  async generateJson(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const jsonPrompt = `${params.prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation.`;
    return this.messages({
      model: params.model,
      prompt: jsonPrompt,
      systemInstruction: params.systemInstruction,
      timeoutMs: params.timeoutMs,
    });
  }

  private async messages(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const body: any = {
        model: params.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: params.prompt }],
      };

      if (params.systemInstruction) {
        body.system = params.systemInstruction;
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'anthropic', status: res.status, message: `Anthropic error (${res.status}): ${txt}` });
      }

      const json: any = await res.json();
      const text = json?.content?.map((c: any) => c?.text).filter(Boolean).join('') || '';

      if (!text) {
        throw new AIProviderError({ provider: 'anthropic', message: 'Anthropic returned empty response' });
      }

      return { text };
    } finally {
      clearTimeout(timeout);
    }
  }
}
