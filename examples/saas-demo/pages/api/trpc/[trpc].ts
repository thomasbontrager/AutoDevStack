import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@/server/routers';
import { createContext } from '@/server/context';

export default createNextApiHandler({
  router: appRouter,
  createContext,
  onError: ({ error }) => {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      console.error('tRPC internal error:', error);
    }
  },
});
