import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';

export const userRouter = Router();

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

userRouter.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

userRouter.post('/', async (req, res) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const user = await prisma.user.create({
      data: body,
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else {
      console.error('Failed to create user:', err);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

userRouter.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('Failed to fetch user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
