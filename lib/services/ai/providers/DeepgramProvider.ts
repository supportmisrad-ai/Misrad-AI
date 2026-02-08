import { AIProviderError } from '../errors';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

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
        body: params.audioBuffer,
        signal: ac.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new AIProviderError({ provider: 'deepgram', status: res.status, message: `Deepgram error (${res.status}): ${text}` });
      }

      const json: unknown = await res.json().catch(() => null);
      const jsonObj = asObject(json) ?? {};
      const resultsObj = asObject(jsonObj.results) ?? {};

      const channels = Array.isArray(resultsObj.channels) ? resultsObj.channels : [];
      const firstChannelObj = channels.length > 0 ? asObject(channels[0]) : null;
      const alternatives = Array.isArray(firstChannelObj?.alternatives) ? firstChannelObj?.alternatives : [];
      const firstAltObj = alternatives.length > 0 ? asObject(alternatives[0]) : null;
      const transcriptFromChannels = typeof firstAltObj?.transcript === 'string' ? firstAltObj.transcript : '';

      const utterances = Array.isArray(resultsObj.utterances) ? resultsObj.utterances : [];
      const transcriptFromUtterances = utterances
        .map((u) => {
          const uObj = asObject(u) ?? {};
          return typeof uObj.transcript === 'string' ? uObj.transcript : '';
        })
        .filter(Boolean)
        .join('\n');

      const transcript = transcriptFromChannels || transcriptFromUtterances || '';

      return { text: transcript };
    } catch (err: unknown) {
      const obj = asObject(err) ?? {};
      const errName = typeof obj.name === 'string' ? obj.name : err instanceof Error ? err.name : '';
      if (String(errName || '') === 'AbortError') {
        throw new AIProviderError({
          provider: 'deepgram',
          status: 504,
          message: 'השרת עמוס כרגע ולא הצלחנו לתמלל בזמן. נסה שוב בעוד דקה.',
          cause: err,
        });
      }
      throw err instanceof Error ? err : new Error(getErrorMessage(err) || 'Deepgram request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
