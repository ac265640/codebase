import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { User, IUser } from '../models/User';
import { setTokenCookies, clearTokenCookies, verifyRefreshToken, signAccessToken, signRefreshToken } from '../utils/tokens';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

function isValidGmailAddress(email: string): boolean {
  const gmailRegex = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;
  return gmailRegex.test(email.trim());
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'email, password, and displayName are required' });
      return;
    }
    if (!isValidGmailAddress(email)) {
      res.status(400).json({ error: 'Only Gmail addresses (@gmail.com) are accepted.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });

    if (exists) {
      // If they have a password already → genuine duplicate
      if (exists.passwordHash && exists.passwordHash !== 'GOOGLE_AUTH_NO_PASSWORD') {
        res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
        return;
      }

      // If Google-only account → add password to it (account merge)
      const hash = await bcrypt.hash(password, 12);
      const updatedUser = await User.findByIdAndUpdate(exists._id, {
        passwordHash: hash,
        displayName: displayName.trim(),
        isEmailVerified: true, // auto-verified
      }, { new: true });

      if (!updatedUser) {
        res.status(500).json({ error: 'Failed to update account.' });
        return;
      }

      const access = signAccessToken(updatedUser._id.toString());
      const refresh = signRefreshToken(updatedUser._id.toString());
      setTokenCookies(res, updatedUser._id.toString());
      res.status(201).json({
        user: { id: updatedUser._id, email: updatedUser.email, displayName: updatedUser.displayName, isEmailVerified: true },
        accessToken: access,
        refreshToken: refresh,
        message: 'Account updated. You can now log in.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      isEmailVerified: true, // no OTP — auto-verified on registration
    });

    const access = signAccessToken(user._id.toString());
    const refresh = signRefreshToken(user._id.toString());
    setTokenCookies(res, user._id.toString());
    res.status(201).json({
      user: { id: user._id, email: user.email, displayName: user.displayName, isEmailVerified: true },
      accessToken: access,
      refreshToken: refresh,
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
    if (!isValidGmailAddress(email)) {
      res.status(400).json({ error: 'Only Gmail addresses (@gmail.com) are accepted.' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const access = signAccessToken(user._id.toString());
    const refresh = signRefreshToken(user._id.toString());
    setTokenCookies(res, user._id.toString());
    res.json({
      user: { id: user._id, email: user.email, displayName: user.displayName, isEmailVerified: user.isEmailVerified },
      accessToken: access,
      refreshToken: refresh,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }
    const payload = verifyRefreshToken(token);
    const newAccess = signAccessToken(payload.id);
    const newRefresh = signRefreshToken(payload.id);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', newAccess, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      ok: true,
      accessToken: newAccess,
      refreshToken: newRefresh,
    });
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
  res.json({ 
    id: u._id, 
    email: u.email, 
    displayName: u.displayName, 
    avatar: u.avatar,
    isEmailVerified: u.isEmailVerified,
    googleId: u.googleId
  });
});

// GET /api/auth/google
authRouter.get('/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false,
  })
);

// GET /api/auth/google/callback and /api/auth/google/call
authRouter.get(['/google/callback', '/google/call'],
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
      return;
    }
    setTokenCookies(res, user._id.toString());
    const handoffToken = signAccessToken(user._id.toString());
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${handoffToken}`);
  }
);
