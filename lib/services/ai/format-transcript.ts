/**
 * Post-process raw transcription text to improve readability:
 * - Preserve speaker labels (דובר 1:, דובר 2:, Speaker 0:, etc.)
 * - Insert line breaks at sentence boundaries
 * - Group into paragraphs every ~4 sentences (only for non-diarized text)
 * - Clean up whitespace
 */
export function formatTranscriptText(raw: string): string {
  if (!raw || !raw.trim()) return raw;

  let text = raw.trim();

  // Check if text already has speaker labels (diarized)
  const hasSpeakerLabels = /^(דובר\s*\d+|Speaker\s*\d+)\s*:/m.test(text);

  if (hasSpeakerLabels) {
    // Diarized text: clean up but preserve speaker structure
    // Normalize whitespace within lines but keep line breaks
    const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    // Add empty line between different speakers for readability
    const formatted: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      formatted.push(lines[i]);
      // Add separator between speaker blocks
      if (i < lines.length - 1) {
        const currentIsSpeaker = /^(דובר\s*\d+|Speaker\s*\d+)\s*:/.test(lines[i]);
        const nextIsSpeaker = /^(דובר\s*\d+|Speaker\s*\d+)\s*:/.test(lines[i + 1]);
        if (currentIsSpeaker && nextIsSpeaker) {
          formatted.push('');
        }
      }
    }
    return formatted.join('\n');
  }

  // Non-diarized text: add sentence breaks and paragraph grouping
  // Normalize whitespace (multiple spaces → single space)
  text = text.replace(/\s+/g, ' ');

  // Insert line break after Hebrew/Latin sentence endings (. ? ! followed by space + letter)
  text = text.replace(/([.?!。])\s+(?=[א-תA-Za-z\u0600-\u06FF])/g, '$1\n');

  // Split into sentences and group into paragraphs (~4 sentences each)
  const lines = text.split('\n').filter((l) => l.trim());
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    currentParagraph.push(line.trim());
    if (currentParagraph.length >= 4) {
      paragraphs.push(currentParagraph.join('\n'));
      currentParagraph = [];
    }
  }
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join('\n'));
  }

  return paragraphs.join('\n\n');
}
