import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { db } from '@/lib/db';

export async function createContext({
  req,
  res,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
}) {
  const session = await getServerSession(req, res, authOptions);
  return { session, db, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
