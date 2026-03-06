import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 5000;

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4000'] }));
app.use(express.json());

app.use('/api/chat', chatRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-pipeline', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🤖 AI pipeline service running on http://localhost:${PORT}`);
  console.log(`   Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  console.log(`   Model: ${process.env.AI_MODEL || 'gpt-4o-mini'}`);
});

export default app;
