import { gameRouter } from "./routers/game";
import { kycRouter } from "./routers/kyc";
import { walletRouter } from "./routers/wallet";
import { router } from "./trpc";

export const appRouter = router({
  game: gameRouter,
  wallet: walletRouter,
  kyc: kycRouter,
});

export type AppRouter = typeof appRouter;
