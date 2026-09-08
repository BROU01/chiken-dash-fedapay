import type { inferRouterOutputs } from "@trpc/server";
import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RoundView = RouterOutputs["game"]["state"];
export type PublicBetView = NonNullable<RoundView["yourBet"]>;

const FAST_POLL_MS = 250;
const BACKUP_POLL_MS = 1000;
const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST as string | undefined;
const PARTY_ROOM = "chicken-crash";

/**
 * Merges two sources of round state: a PartyKit WebSocket pushing the public
 * fields near-instantly, and a tRPC poll that's the only source for
 * `yourBet` (the party server relays a session-less fetch, so it never sees
 * a signed-in user). Falls back to fast tRPC-only polling whenever PartyKit
 * isn't configured or its socket isn't currently connected, so the game
 * stays fully playable without it.
 */
export function useGameState(enabled: boolean) {
  const utils = trpc.useUtils();
  const [live, setLive] = useState<RoundView | null>(null);
  const [partyConnected, setPartyConnected] = useState(false);

  const query = trpc.game.state.useQuery(undefined, {
    enabled,
    refetchInterval: enabled ? (partyConnected ? BACKUP_POLL_MS : FAST_POLL_MS) : false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const partyConnectedRef = useRef(partyConnected);
  partyConnectedRef.current = partyConnected;

  useEffect(() => {
    if (!enabled || !PARTY_HOST) return;
    const socket = new PartySocket({ host: PARTY_HOST, room: PARTY_ROOM });

    const handleOpen = () => setPartyConnected(true);
    const handleDrop = () => setPartyConnected(false);
    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as { type?: string; state?: RoundView };
        if (parsed.type === "state" && parsed.state) setLive(parsed.state);
      } catch {
        // ignore malformed frames
      }
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleDrop);
    socket.addEventListener("error", handleDrop);
    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleDrop);
      socket.removeEventListener("error", handleDrop);
      socket.removeEventListener("message", handleMessage);
      socket.close();
      setPartyConnected(false);
      setLive(null);
    };
  }, [enabled]);

  const trpcState = query.data ?? null;
  // Same round on both feeds: take the low-latency public fields from the
  // socket, but yourBet only ever comes from the authenticated tRPC poll.
  const state = live && partyConnected ? { ...live, yourBet: trpcState && trpcState.roundId === live.roundId ? trpcState.yourBet : null } : trpcState;

  return {
    state,
    connected: partyConnected || !query.isError,
    refreshNow: () => utils.game.state.fetch(),
  };
}
