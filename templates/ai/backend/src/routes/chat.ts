import { Router } from 'express';
import { z } from 'zod';

export const chatRouter = Router();

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  sessionId: z.string().optional(),
});

// Forward to the AI service
chatRouter.post('/', async (req, res) => {
  try {
    const body = ChatRequestSchema.parse(req.body);
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';

    const response = await fetch(`${aiServiceUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else {
      console.error('Chat proxy error:', err);
      res.status(502).json({ error: 'Failed to reach AI service' });
    }
  }
});
