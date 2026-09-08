/** Shared between server (authoritative) and client (smooth cosmetic interpolation between polls). */
export const GROWTH_RATE = 0.24;

export function multiplierAt(elapsedMs: number): number {
  return Math.exp(GROWTH_RATE * (Math.max(0, elapsedMs) / 1000));
}
