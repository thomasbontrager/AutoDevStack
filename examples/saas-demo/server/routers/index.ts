import { router } from '../trpc';
import { userRouter } from './user';
import { subscriptionRouter } from './subscription';

export const appRouter = router({
  user: userRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
