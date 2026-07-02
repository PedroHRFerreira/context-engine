import type { IContentChunk } from '../types/context.js';
import { sha256 } from '../utils/hash.js';

export function chunkContent(content: string, chunkSize: number): IContentChunk[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error('chunkSize must be a positive integer');
  }

  const lines = content.length > 0 ? content.split(/\r?\n/) : [''];
  const chunks: IContentChunk[] = [];

  for (let index = 0; index < lines.length; index += chunkSize) {
    const chunkLines = lines.slice(index, index + chunkSize);
    const chunkText = chunkLines.join('\n');

    chunks.push({
      startLine: index + 1,
      endLine: index + chunkLines.length,
      content: chunkText,
      hash: sha256(chunkText)
    });
  }

  return chunks;
}
