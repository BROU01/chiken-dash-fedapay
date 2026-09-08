import type * as Party from "partykit/server";

/**
 * Relays the shared round state to every connected browser over WebSocket.
 *
 * This party has no database access (it runs on Cloudflare Workers, not
 * Node — no `pg` TCP driver here). Instead it polls our own Express/tRPC
 * server's public `game.state` query — the same procedure the browser would
 * otherwise poll directly — and broadcasts each *changed* tick to every
 * connection in the room. Authenticated fields (`yourBet`) are always null
 * here since this poll carries no user session; the client merges this feed
 * with its own authenticated tRPC poll for that part.
 */
const POLL_MS = 200;

function stateUrl(env: Record<string, unknown>): string {
  const origin = typeof env.APP_ORIGIN === "string" && env.APP_ORIGIN ? env.APP_ORIGIN : "http://localhost:3000";
  return `${origin}/api/trpc/game.state`;
}

export default class ChickenCrashParty implements Party.Server {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPayload: string | null = null;

  constructor(readonly room: Party.Room) {}

  onConnect(connection: Party.Connection) {
    this.ensurePolling();
    if (this.lastPayload) {
      connection.send(this.lastPayload);
    }
  }

  onClose() {
    this.stopPollingIfEmpty();
  }

  onError() {
    this.stopPollingIfEmpty();
  }

  private ensurePolling() {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), POLL_MS);
  }

  private stopPollingIfEmpty() {
    const stillConnected = !this.room.getConnections()[Symbol.iterator]().next().done;
    if (stillConnected) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    try {
      const response = await fetch(stateUrl(this.room.env));
      if (!response.ok) return;
      const body = (await response.json()) as { result?: { data?: unknown } };
      const state = body.result?.data;
      if (!state) return;
      const payload = JSON.stringify({ type: "state", state });
      if (payload === this.lastPayload) return;
      this.lastPayload = payload;
      this.room.broadcast(payload);
    } catch {
      // Transient fetch failure against our own origin — the next tick retries.
    }
  }
}
