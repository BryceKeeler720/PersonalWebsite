const WORDS_PER_MINUTE = 220;

export function calculateReadingTime(content: string): string {
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const minutes = Math.ceil(words.length / WORDS_PER_MINUTE);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

export function getWordCount(content: string): number {
  const text = content.replace(/<[^>]*>/g, '');
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}
