import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function signAccessToken(userId: string): string {
  return jwt.sign({ id: userId }, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { id: string } {
  return jwt.verify(token, ACCESS_SECRET) as { id: string };
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, REFRESH_SECRET) as { id: string };
}

export function setTokenCookies(res: import('express').Response, userId: string): void {
  const access = signAccessToken(userId);
  const refresh = signRefreshToken(userId);
  const isProd = process.env.NODE_ENV === 'production';

  const cookieBase = {
    httpOnly: true,
    secure: isProd,                         // must be true for sameSite: 'none'
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    // CRITICAL: domain must NOT be set — let browser infer it
  };

  res.cookie('access_token', access, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refresh, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearTokenCookies(res: import('express').Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  };
  res.clearCookie('access_token', opts);
  res.clearCookie('refresh_token', opts);
}
