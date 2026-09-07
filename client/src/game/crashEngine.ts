/**
 * Framework-agnostic crash-round engine.
 *
 * The UI owns the render loop: it calls start(ceiling) when a round begins,
 * then polls tick() on its own interval/animation frame. Every tick() returns
 * an immutable RoundSnapshot describing the round at the current instant.
 *
 * Round lifecycle:
 *   idle → start(ceiling) → live → tick() until the hidden crash point → crashed
 *                                   └→ cashOut() → cashed (multiplier frozen)
 */

export type RoundStatus = "idle" | "live" | "crashed" | "cashed";

export interface RoundSnapshot {
  status: RoundStatus;
  /** Current payout multiplier, e.g. 1.00 at takeoff, 2.42 mid-flight. */
  multiplier: number;
  /** Hidden crash point of the active round. */
  crashAt: number;
  /** Milliseconds elapsed since the round started. */
  elapsedMs: number;
}

/** Multiplier growth rate: multiplier = e^(GROWTH_RATE * seconds). */
const GROWTH_RATE = 0.24;

/** Smallest possible crash point (instant bust, used by real-money mode). */
const MIN_CRASH = 1.01;

/** House-edge term of the crash-point formula. */
const HOUSE_EDGE = 0.04;

/** Safety clamp on the uniform sample. */
const MAX_UNIFORM = 0.98;

/**
 * Crash point from a uniform sample in [0, 1).
 *
 * Uses the classic inverse-uniform formula from crash games,
 * crash = (1 - houseEdge) / (1 - uniform), which yields an exponential-like
 * distribution: most rounds bust early, rare rounds fly high.
 */
function crashPointFromUniform(uniform: number): number {
  const raw = (1 - HOUSE_EDGE) / (1 - uniform);
  return Math.max(MIN_CRASH, Math.round(raw * 100) / 100);
}

/** Multiplier at the given elapsed time. */
function multiplierAt(elapsedMs: number): number {
  return Math.exp(GROWTH_RATE * (Math.max(0, elapsedMs) / 1000));
}

export class CrashRoundEngine {
  private status: RoundStatus = "idle";
  private crashAt = MIN_CRASH;
  private startedAtMs = 0;
  private cashedSnapshot: RoundSnapshot | null = null;

  /**
   * Begin a round. `ceiling` caps the hidden crash point; rejection sampling
   * keeps the classic exponential distribution shape below the cap instead of
   * piling rounds onto the cap value. A ceiling equal to MIN_CRASH produces an
   * instant-bust round (the curve barely climbs before crashing).
   */
  start(ceiling = 20): void {
    let uniform = Math.random() * MAX_UNIFORM;
    while (crashPointFromUniform(uniform) > ceiling) {
      uniform = Math.random() * MAX_UNIFORM;
    }
    this.crashAt = crashPointFromUniform(uniform);
    this.startedAtMs = Date.now();
    this.cashedSnapshot = null;
    this.status = "live";
  }

  /**
   * Cash out the in-flight round at its current multiplier. The payout is
   * rounded down so the player never banks more than what was displayed.
   * No-op unless the round is still live.
   */
  cashOut(): void {
    if (this.status !== "live") return;
    const elapsedMs = Date.now() - this.startedAtMs;
    const multiplier = Math.floor(multiplierAt(elapsedMs) * 100) / 100;
    this.cashedSnapshot = { status: "cashed", multiplier, crashAt: this.crashAt, elapsedMs };
    this.status = "cashed";
  }

  /** Sample the round state at the current instant. */
  tick(): RoundSnapshot {
    if (this.status === "live") {
      const elapsedMs = Date.now() - this.startedAtMs;
      const multiplier = multiplierAt(elapsedMs);
      if (multiplier >= this.crashAt) {
        // The crash resolves on the first tick that crosses the hidden point.
        this.status = "crashed";
        return { status: "crashed", multiplier: this.crashAt, crashAt: this.crashAt, elapsedMs };
      }
      return { status: "live", multiplier, crashAt: this.crashAt, elapsedMs };
    }
    if (this.status === "cashed" && this.cashedSnapshot) {
      return this.cashedSnapshot;
    }
    if (this.status === "crashed") {
      return {
        status: "crashed",
        multiplier: this.crashAt,
        crashAt: this.crashAt,
        elapsedMs: Date.now() - this.startedAtMs,
      };
    }
    return { status: "idle", multiplier: 1, crashAt: this.crashAt, elapsedMs: 0 };
  }
}
