/**
 * Post-process raw transcription text to improve readability:
 * - Insert line breaks at sentence boundaries
 * - Group into paragraphs every ~3-4 sentences
 * - Clean up whitespace
 */
export function formatTranscriptText(raw: string): string {
  if (!raw || !raw.trim()) return raw;

  let text = raw.trim();

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
