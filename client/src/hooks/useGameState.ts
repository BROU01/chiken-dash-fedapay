import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface PublicBetView {
  stake: number;
  status: "placed" | "cashed" | "lost";
  autoCashoutTarget: number | null;
  cashoutMultiplier: number | null;
  payout: number | null;
}

export interface RoundView {
  roundId: number;
  nonce: number;
  serverSeedHash: string;
  status: "betting" | "live" | "crashed";
  multiplier: number;
  startsAt: string;
  serverNow: number;
  bettingOpensInMs: number;
  crashPoint: number | null;
  serverSeed: string | null;
  yourBet: PublicBetView | null;
  recentCrashes: number[];
}

const POLL_MS = 250;

/** Polls the shared round state while `enabled`. The server is the only source of truth; this is display data only. */
export function useGameState(enabled: boolean) {
  const [state, setState] = useState<RoundView | null>(null);
  const [connected, setConnected] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);

  const fetchNow = useCallback(async () => {
    try {
      const data = await api.get<RoundView>("/game/state");
      setState(data);
      setConnected(true);
      return data;
    } catch {
      setConnected(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const loop = async () => {
      await fetchNow();
      if (!cancelled) timerRef.current = window.setTimeout(loop, POLL_MS);
    };
    loop();

    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
    };
  }, [enabled, fetchNow]);

  return { state, connected, refreshNow: fetchNow };
}
