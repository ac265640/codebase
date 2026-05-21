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

export function setTokenCookies(res: import('express').Response, userId: string) {
  const access = signAccessToken(userId);
  const refresh = signRefreshToken(userId);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('access_token', access, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearTokenCookies(res: import('express').Response) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
}
