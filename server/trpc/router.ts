import { gameRouter } from "./routers/game";
import { walletRouter } from "./routers/wallet";
import { router } from "./trpc";

export const appRouter = router({
  game: gameRouter,
  wallet: walletRouter,
});

export type AppRouter = typeof appRouter;
