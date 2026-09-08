import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RoundView = RouterOutputs["game"]["state"];
export type PublicBetView = NonNullable<RoundView["yourBet"]>;

const POLL_MS = 250;

/** Polls the shared round state while `enabled`. The server is the only source of truth; this is display data only. */
export function useGameState(enabled: boolean) {
  const utils = trpc.useUtils();
  const query = trpc.game.state.useQuery(undefined, {
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    state: query.data ?? null,
    connected: !query.isError,
    refreshNow: () => utils.game.state.fetch(),
  };
}
