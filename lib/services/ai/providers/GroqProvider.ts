import { AIProviderError } from '../errors';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

export class GroqProvider {
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
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      console.log('[GroqProvider.transcribe] Preparing Whisper request', {
        model: params.model,
        mimeType: params.mimeType,
        bufferSize: params.audioBuffer.byteLength,
      });

      // Create FormData for multipart upload
      const formData = new FormData();
      const blob = new Blob([params.audioBuffer], { type: params.mimeType });
      formData.append('file', blob, 'audio.mp3');
      formData.append('model', params.model);
      formData.append('language', 'he'); // Hebrew
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'groq', status: res.status, message: `Groq Whisper error (${res.status}): ${txt}` });
      }

      const json: unknown = await res.json();
      const obj = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
      const segments = Array.isArray(obj.segments) ? obj.segments : [];

      let text: string;
      if (segments.length > 0) {
        const fmtTs = (sec: number): string => {
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60);
          return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
        };
        text = segments
          .map((seg) => {
            const s = (seg && typeof seg === 'object' ? seg : {}) as Record<string, unknown>;
            const segText = typeof s.text === 'string' ? s.text.trim() : '';
            const startSec = typeof s.start === 'number' ? s.start : 0;
            return segText ? `${fmtTs(startSec)} ${segText}` : '';
          })
          .filter(Boolean)
          .join('\n');
      } else {
        text = typeof obj.text === 'string' ? obj.text : '';
      }

      console.log('[GroqProvider.transcribe] Whisper response', {
        textLength: text.length,
        textPreview: text.substring(0, 100),
        hasText: !!text,
        segmentsCount: segments.length,
      });

      return { text: text.trim() };
    } catch (err: unknown) {
      const errObj = asObject(err) ?? {};
      const errName = typeof errObj.name === 'string' ? errObj.name : err instanceof Error ? err.name : '';
      if (String(errName || '') === 'AbortError') {
        throw new AIProviderError({
          provider: 'groq',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו לתמלל בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err instanceof Error ? err : new Error(getErrorMessage(err) || 'Groq Whisper failed');
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

  private async chat(params: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
    responseFormat?: { type: 'json_object' };
  }): Promise<{ text: string }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      type GroqMessage = { role: 'system' | 'user'; content: string };
      type GroqChatBody = {
        model: string;
        messages: GroqMessage[];
        response_format?: { type: 'json_object' };
      };

      const messages: GroqMessage[] = [];
      if (params.systemInstruction) {
        messages.push({ role: 'system', content: params.systemInstruction });
      }
      messages.push({ role: 'user', content: params.prompt });

      const body: GroqChatBody = {
        model: params.model,
        messages,
        ...(params.responseFormat ? { response_format: params.responseFormat } : {}),
      };

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

      const json: unknown = await res.json().catch(() => null);
      const jsonObj = asObject(json) ?? {};
      const choices = Array.isArray(jsonObj.choices) ? jsonObj.choices : [];
      const firstChoiceObj = choices.length > 0 ? asObject(choices[0]) : null;
      const messageObj = asObject(firstChoiceObj?.message);
      const content = messageObj?.content;
      const text = typeof content === 'string' ? content : '';

      if (!text) {
        throw new AIProviderError({ provider: 'groq', message: 'Groq returned empty response' });
      }

      return { text };
    } catch (err: unknown) {
      const errObj = asObject(err) ?? {};
      const errName = typeof errObj.name === 'string' ? errObj.name : err instanceof Error ? err.name : '';
      if (String(errName || '') === 'AbortError') {
        throw new AIProviderError({
          provider: 'groq',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו לנתח בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err instanceof Error ? err : new Error(getErrorMessage(err) || 'Groq request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
