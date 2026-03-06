import { Router } from 'express';
import { z } from 'zod';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createChatChain } from '../chains/chat.js';
import { createLLM } from '../lib/llm.js';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const chatRouter = Router();

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  sessionId: z.string().optional(),
});

chatRouter.post('/', async (req, res) => {
  try {
    const body = ChatRequestSchema.parse(req.body);
    const sessionId = body.sessionId || `anon-${Date.now()}`;

    // Use the last user message as input for the chain
    const lastUserMessage = [...body.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage) {
      res.status(400).json({ error: 'No user message found' });
      return;
    }

    const chain = createChatChain();
    const result = await chain.invoke(
      { input: lastUserMessage.content },
      { configurable: { sessionId } }
    );

    res.json({
      role: 'assistant',
      content: result.content,
      sessionId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else if (err instanceof Error) {
      console.error('Chat error:', err.message);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Simple single-turn completion endpoint (no history)
chatRouter.post('/complete', async (req, res) => {
  try {
    const { prompt: userPrompt, systemPrompt } = z
      .object({ prompt: z.string().min(1), systemPrompt: z.string().optional() })
      .parse(req.body);

    const llm = createLLM();
    const messages = [];
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(userPrompt));

    const result = await llm.invoke(messages);

    res.json({
      content: result.content,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
    } else if (err instanceof Error) {
      console.error('Completion error:', err.message);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
