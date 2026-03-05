import type { NextApiRequest, NextApiResponse } from 'next';
import { createNextApiHandler } from '@trpc/next';
import { appRouter } from '@/server/routers';

export default createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
});
