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
      console.log('[DeepgramProvider.transcribe] Preparing request', {
        mimeType: params.mimeType,
        bufferSize: params.audioBuffer.byteLength,
      });

      const res = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&diarize=true&utterances=true&language=he&model=nova-2', {
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

      const fmtTs = (sec: number): string => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
      };

      // Build diarized transcript from utterances (speaker-labeled + timestamps)
      let transcriptFromUtterances = '';
      if (utterances.length > 0) {
        const speakerMap = new Map<number, number>();
        let speakerCounter = 0;
        transcriptFromUtterances = utterances
          .map((u) => {
            const uObj = asObject(u) ?? {};
            const text = typeof uObj.transcript === 'string' ? uObj.transcript : '';
            if (!text) return '';
            const startSec = typeof uObj.start === 'number' ? uObj.start : 0;
            const ts = fmtTs(startSec);
            const rawSpeaker = typeof uObj.speaker === 'number' ? uObj.speaker : -1;
            if (rawSpeaker >= 0 && !speakerMap.has(rawSpeaker)) {
              speakerMap.set(rawSpeaker, ++speakerCounter);
            }
            const speakerLabel = rawSpeaker >= 0 ? `דובר ${speakerMap.get(rawSpeaker)}` : '';
            return speakerLabel ? `${ts} ${speakerLabel}: ${text}` : `${ts} ${text}`;
          })
          .filter(Boolean)
          .join('\n');
      } else {
        // Fallback: try to extract from words with speaker info
        const wordsArr = Array.isArray(firstAltObj?.words) ? firstAltObj!.words : [];
        if (wordsArr.length > 0) {
          const speakerMap = new Map<number, number>();
          let speakerCounter = 0;
          let currentSpeaker = -1;
          const segments: string[] = [];
          let currentSegment = '';

          for (const w of wordsArr) {
            const wObj = asObject(w) ?? {};
            const word = typeof wObj.punctuated_word === 'string' ? wObj.punctuated_word : (typeof wObj.word === 'string' ? wObj.word : '');
            const speaker = typeof wObj.speaker === 'number' ? wObj.speaker : -1;
            const wordStart = typeof wObj.start === 'number' ? wObj.start : 0;

            if (speaker >= 0 && speaker !== currentSpeaker) {
              if (currentSegment.trim()) segments.push(currentSegment.trim());
              if (!speakerMap.has(speaker)) speakerMap.set(speaker, ++speakerCounter);
              currentSegment = `${fmtTs(wordStart)} דובר ${speakerMap.get(speaker)}: ${word}`;
              currentSpeaker = speaker;
            } else {
              currentSegment += ` ${word}`;
            }
          }
          if (currentSegment.trim()) segments.push(currentSegment.trim());
          if (segments.length > 0 && speakerMap.size > 1) {
            transcriptFromUtterances = segments.join('\n');
          }
        }
      }

      // Prefer diarized utterances over flat channel transcript
      const transcript = (transcriptFromUtterances && transcriptFromUtterances.includes('דובר'))
        ? transcriptFromUtterances
        : transcriptFromChannels || transcriptFromUtterances || '';
      console.log('[DeepgramProvider.transcribe] Response received', {
        textLength: transcript.length,
        textPreview: transcript.substring(0, 100),
        hasText: !!transcript,
        channelsFound: channels.length,
        utterancesFound: utterances.length,
      });

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
