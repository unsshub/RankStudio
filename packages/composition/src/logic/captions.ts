export interface CaptionChunk {
  text: string;
  startSec: number;
  endSec: number;
}

export function buildCaptionChunks(
  script: string,
  durationSec: number,
  wordsPerChunk = 3
): CaptionChunk[] {
  const words = script
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0 || durationSec <= 0) {
    return [];
  }

  const chunkCount = Math.ceil(words.length / wordsPerChunk);
  const perWord = durationSec / words.length;
  const chunks: CaptionChunk[] = [];

  let wordIndex = 0;
  for (let i = 0; i < chunkCount; i++) {
    const slice = words.slice(wordIndex, wordIndex + wordsPerChunk);
    const startSec = wordIndex * perWord;
    wordIndex += slice.length;
    const endSec = i === chunkCount - 1 ? durationSec : wordIndex * perWord;
    chunks.push({
      text: slice.join(" "),
      startSec,
      endSec,
    });
  }

  return chunks;
}
