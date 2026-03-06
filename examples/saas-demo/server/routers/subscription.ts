import { router, protectedProcedure } from '../trpc';

export const subscriptionRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.subscription.findFirst({
      where: {
        user: { email: ctx.session.user!.email! },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),
});
