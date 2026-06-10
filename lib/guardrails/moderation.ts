import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

// Topic moderation: a fast, cheap model classifies the topic SAFE or UNSAFE
// before any debate starts. (Groq retired the dedicated Llama Guard model, so
// we use a strict classifier prompt on the instant 8B model instead.)
// Toggle with ENABLE_MODERATION=false in .env.local — handy during development.

export function moderationEnabled(): boolean {
  return process.env.ENABLE_MODERATION !== 'false';
}

export async function isTopicAllowed(topic: string): Promise<boolean> {
  if (!moderationEnabled()) return true;

  try {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system:
        'You are a content moderator for a public debate app. Classify the topic. ' +
        'Reply with exactly one word: UNSAFE if it promotes hatred against a group, sexual content involving minors, ' +
        'self-harm, or instructions for violence/illegal acts. Otherwise reply SAFE. ' +
        'Controversial, political, or provocative topics are SAFE — debate is the point.',
      prompt: `Debate topic: "${topic}"`,
      maxOutputTokens: 5,
      temperature: 0,
    });
    return !text.trim().toUpperCase().startsWith('UNSAFE');
  } catch (err) {
    // If the moderation call itself fails, we fail open (allow the debate)
    // rather than taking the whole product down with it.
    console.error('Moderation check failed, allowing topic:', err);
    return true;
  }
}
