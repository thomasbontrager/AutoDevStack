import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { chatRouter } from './routes/chat.js';
import { userRouter } from './routes/users.js';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/users', userRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
});

export default app;
