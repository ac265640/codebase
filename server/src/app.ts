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
import { guestRouter } from './routes/guest';

export const app = express();

// Trust Render's proxy for correct IP in rate limiting
app.set('trust proxy', true);

app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,           // production Vercel URL
  'http://localhost:3000',           // local dev
  'http://localhost:5173',           // Vite default port
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
import { billingRouter } from './routes/billing';

app.use(morgan('dev'));

// Conditionally parse JSON to bypass express.json() for Stripe webhook raw body verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(cookieParser());

import passport from './config/passport';
app.use(passport.initialize());

// Robust client IP key generator to avoid proxy conflation
const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
      return forwarded[0].trim();
    }
  }
  return req.ip || req.socket.remoteAddress || 'unknown-ip';
};

// Global rate limit — 10000 requests per 15 min per IP (raised for reliability)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
}));

// Forgot-password rate limit — max 3 reset requests per IP per hour
app.use('/api/auth/forgot-password', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many reset requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
}));

app.use('/api/auth', authRouter);
app.use('/api/repos', reposRouter);
app.use('/api/chat', chatRouter);
app.use('/api/user', userRouter);
app.use('/api/billing', billingRouter);
app.use('/api/guest', guestRouter);

import { usageRouter } from './routes/usage';
app.use('/api/usage', usageRouter);

import { apiKeyRouter } from './routes/apiKeys';
app.use('/api/keys', apiKeyRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});
