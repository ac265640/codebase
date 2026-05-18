import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { reposRouter } from './routes/repos';
import { chatRouter } from './routes/chat';
import { userRouter } from './routes/user';

export const app = express();

// Trust Render's proxy for correct IP in rate limiting
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Global rate limit — 200 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Chat-specific rate limit — 10 per minute (LLM calls are expensive)
app.use('/api/chat', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
}));

app.use('/api/auth', authRouter);
app.use('/api/repos', reposRouter);
app.use('/api/chat', chatRouter);
app.use('/api/user', userRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});
