import { QUOTES, type Quote } from "@/lib/data/quotes";

/**
 * Returns up to 5 quotes for a given speakerId, sorted by year descending
 * (most recent in-universe year first).
 *
 * Server-safe: no DOM, no React — can be called from Server Components,
 * API routes, or Server Actions.
 */
export function loadQuotesFor(speakerId: string): Quote[] {
  return QUOTES
    .filter((q) => q.speakerId === speakerId)
    .sort((a, b) => b.year - a.year)
    .slice(0, 5);
}

/**
 * Returns ALL quotes for a given speakerId, sorted by year descending.
 * Use when you need to display a "Show all (N)" expansion.
 */
export function loadAllQuotesFor(speakerId: string): Quote[] {
  return QUOTES
    .filter((q) => q.speakerId === speakerId)
    .sort((a, b) => b.year - a.year);
}
