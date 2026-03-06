import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.post('/auth/register', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const hashed = await bcrypt.hash(password, 10);
  // TODO: persist user to database
  res.status(201).json({ message: 'User registered', email });
});

app.post('/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  // TODO: fetch user from database and verify password with bcrypt.compare before issuing a token
  // Return 501 until real persistence is implemented so callers know this is a stub
  return res.status(501).json({ error: 'Login not implemented: connect a database and verify credentials' });
});

app.get('/auth/me', authLimiter, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Auth service listening on port ${port}`);
});
