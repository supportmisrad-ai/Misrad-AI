import { AIProviderError } from '../errors';

export class DeepgramProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(params: {
    audioBuffer: ArrayBuffer;
    mimeType: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), params.timeoutMs);

    try {
      const res = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&diarize=true&model=nova-2', {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': params.mimeType,
        },
        body: params.audioBuffer as any,
        signal: ac.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'deepgram', status: res.status, message: `Deepgram error (${res.status}): ${text}` });
      }

      const json: any = await res.json();
      const transcript =
        json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
        json?.results?.utterances?.map((u: any) => u.transcript).join('\n') ||
        '';

      return { text: transcript };
    } catch (err: any) {
      if (String(err?.name || '') === 'AbortError') {
        throw new AIProviderError({
          provider: 'deepgram',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו לתמלל בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
