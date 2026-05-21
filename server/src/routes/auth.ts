import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import passport from 'passport';
import { User, IUser } from '../models/User';
import { setTokenCookies, clearTokenCookies, verifyRefreshToken, signAccessToken, signRefreshToken } from '../utils/tokens';
import { authenticate } from '../middleware/authenticate';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/emailService';
import { generateOtp, saveOtp, verifyOtp } from '../utils/otp';

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
        isEmailVerified: false, // require OTP verification for password path
      }, { new: true });

      if (!updatedUser) {
        res.status(500).json({ error: 'Failed to update account.' });
        return;
      }

      const otp = generateOtp();
      await saveOtp(updatedUser._id.toString(), otp);

      console.log(`\n-----------------------------------------`);
      console.log(`[DEVELOPMENT] Generated OTP for merged account ${updatedUser.email}: ${otp}`);
      console.log(`-----------------------------------------\n`);
      sendOtpEmail(updatedUser.email, otp).catch(err =>
        console.error('[OTP] Email send failed:', err)
      );

      const access = signAccessToken(updatedUser._id.toString());
      const refresh = signRefreshToken(updatedUser._id.toString());
      setTokenCookies(res, updatedUser._id.toString());
      res.status(201).json({
        user: { id: updatedUser._id, email: updatedUser.email, displayName: updatedUser.displayName, isEmailVerified: false },
        accessToken: access,
        refreshToken: refresh,
        message: 'Account updated. Please verify your email.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      isEmailVerified: false,
    });

    const otp = generateOtp();
    await saveOtp(user._id.toString(), otp);

    // Send verification email asynchronously
    console.log(`\n-----------------------------------------`);
    console.log(`[DEVELOPMENT] Generated OTP for ${user.email}: ${otp}`);
    console.log(`-----------------------------------------\n`);
    sendOtpEmail(user.email, otp).catch((e) => console.error('Failed to send registration OTP email:', e));

    const access = signAccessToken(user._id.toString());
    const refresh = signRefreshToken(user._id.toString());
    setTokenCookies(res, user._id.toString());
    res.status(201).json({
      user: { id: user._id, email: user.email, displayName: user.displayName, isEmailVerified: user.isEmailVerified },
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

// POST /api/auth/verify-email
authRouter.post('/verify-email', authenticate, async (req: Request, res: Response) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP is required' });

  const user = req.user;
  if (user.isEmailVerified) return res.status(400).json({ error: 'Email already verified' });

  const isValid = await verifyOtp(user._id.toString(), otp);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  user.isEmailVerified = true;
  await user.save();

  res.json({ ok: true, message: 'Email verified successfully' });
});

// POST /api/auth/resend-otp
authRouter.post('/resend-otp', authenticate, async (req: Request, res: Response) => {
  const user = req.user;
  if (user.isEmailVerified) return res.status(400).json({ error: 'Email already verified' });

  const now = new Date();
  const ONE_HOUR = 60 * 60 * 1000;
  if (!user.otpResendWindowStart || (now.getTime() - user.otpResendWindowStart.getTime()) > ONE_HOUR) {
    user.otpResendWindowStart = now;
    user.otpResendCount = 1;
  } else {
    if (user.otpResendCount && user.otpResendCount >= 3) {
      return res.status(429).json({ error: 'Too many resend attempts. Please try again later.' });
    }
    user.otpResendCount = (user.otpResendCount || 0) + 1;
  }

  const otp = generateOtp();
  await saveOtp(user._id.toString(), otp);

  // Send email and catch exact error to diagnose on the client side
  console.log(`\n-----------------------------------------`);
  console.log(`[DEVELOPMENT] Resent OTP for ${user.email}: ${otp}`);
  console.log(`-----------------------------------------\n`);
  try {
    await sendOtpEmail(user.email, otp);
    res.json({ ok: true, message: 'OTP sent' });
  } catch (e) {
    console.error('Failed to send resend OTP email:', e);
    res.status(500).json({
      error: `Failed to send email: ${(e as Error).message || String(e)}`,
      details: (e as Error).message || String(e)
    });
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const SUCCESS_MSG = { message: 'If that email is registered, a reset link has been sent.' };

    if (!email || !isValidGmailAddress(email)) {
      res.json(SUCCESS_MSG);
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.json(SUCCESS_MSG);
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    console.log(`\n-----------------------------------------`);
    console.log(`[DEVELOPMENT] Generated Reset Link for ${email}: ${resetUrl}`);
    console.log(`-----------------------------------------\n`);
    await sendPasswordResetEmail(email, resetUrl);

    res.json(SUCCESS_MSG);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      res.status(400).json({ error: 'token, email, and newPassword are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: tokenHash,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(user._id, {
      passwordHash: newHash,
      passwordResetToken: undefined,
      passwordResetExpiry: undefined,
      $unset: { passwordResetToken: '', passwordResetExpiry: '' },
    });

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
