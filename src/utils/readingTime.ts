/**
 * Calculate estimated reading time for content
 * Based on average adult reading speed of 200-250 wpm
 * Using 220 wpm as a middle ground
 */

const WORDS_PER_MINUTE = 220;

export function calculateReadingTime(content: string): string {
  // Remove HTML tags if present
  const text = content.replace(/<[^>]*>/g, '');

  // Count words (split on whitespace, filter empty strings)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Calculate minutes
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

  // Return formatted string
  if (minutes === 1) {
    return '1 min read';
  }
  return `${minutes} min read`;
}

export function getWordCount(content: string): number {
  const text = content.replace(/<[^>]*>/g, '');
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}
