import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { setTokenCookies, clearTokenCookies, verifyRefreshToken, signAccessToken } from '../utils/tokens';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'email, password, and displayName are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName });
    setTokenCookies(res, user._id.toString());
    res.status(201).json({
      user: { id: user._id, email: user.email, displayName: user.displayName }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    setTokenCookies(res, user._id.toString());
    res.json({
      user: { id: user._id, email: user.email, displayName: user.displayName }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }
    const payload = verifyRefreshToken(token);
    const newAccess = signAccessToken(payload.id);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', newAccess, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearTokenCookies(res);
  res.json({ ok: true });
});

// GET /api/auth/me
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const u = req.user;
  res.json({ id: u._id, email: u.email, displayName: u.displayName, avatar: u.avatar });
});
