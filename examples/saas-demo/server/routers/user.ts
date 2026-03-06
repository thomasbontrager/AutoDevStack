import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { email: ctx.session.user!.email! },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });
  }),

  update: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { email: ctx.session.user!.email! },
        data: { name: input.name },
      });
    }),
});
