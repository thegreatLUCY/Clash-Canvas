import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

// Topic moderation using Llama Guard, a model trained specifically to classify
// content safety. It replies "safe" or "unsafe" (followed by category codes).
// Toggle with ENABLE_MODERATION=false in .env.local — handy during development.

export function moderationEnabled(): boolean {
  return process.env.ENABLE_MODERATION !== 'false';
}

export async function isTopicAllowed(topic: string): Promise<boolean> {
  if (!moderationEnabled()) return true;

  try {
    const { text } = await generateText({
      model: groq('meta-llama/llama-guard-4-12b'),
      prompt: `Debate topic submitted by a user: "${topic}"`,
    });
    return text.trim().toLowerCase().startsWith('safe');
  } catch (err) {
    // If the moderation call itself fails, we fail open (allow the debate)
    // rather than taking the whole product down with it.
    console.error('Moderation check failed, allowing topic:', err);
    return true;
  }
}
