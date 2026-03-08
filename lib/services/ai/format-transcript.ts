// Matches lines that start with optional [MM:SS] timestamp + optional speaker label
const STRUCTURED_LINE_RE = /^(\[\d{1,2}:\d{2}\]\s*)?(דובר\s*\d+|Speaker\s*\d+)\s*:/m;
const TIMESTAMP_LINE_RE = /^\[\d{1,2}:\d{2}\]/m;

/**
 * Post-process raw transcription text to improve readability:
 * - Preserve timestamps [MM:SS] and speaker labels
 * - Insert line breaks at sentence boundaries
 * - Group into paragraphs every ~4 sentences (only for flat text)
 * - Clean up whitespace
 */
export function formatTranscriptText(raw: string): string {
  if (!raw || !raw.trim()) return raw;

  let text = raw.trim();

  // Check if text already has speaker labels or timestamps (structured output)
  const hasStructure = STRUCTURED_LINE_RE.test(text) || TIMESTAMP_LINE_RE.test(text);

  if (hasStructure) {
    // Structured text: clean up whitespace within lines but preserve line structure
    const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const formatted: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      formatted.push(lines[i]);
      // Add empty line between different speaker blocks for readability
      if (i < lines.length - 1) {
        const currentHasLabel = STRUCTURED_LINE_RE.test(lines[i]);
        const nextHasLabel = STRUCTURED_LINE_RE.test(lines[i + 1]);
        if (currentHasLabel && nextHasLabel) {
          formatted.push('');
        }
      }
    }
    return formatted.join('\n');
  }

  // Flat text (no timestamps/speakers): add sentence breaks and paragraph grouping
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/([.?!。])\s+(?=[א-תA-Za-z\u0600-\u06FF])/g, '$1\n');

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
