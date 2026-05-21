import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken } from '../utils/tokens';
import { User } from '../models/User';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Check for API key in Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const tokenValue = authHeader.substring(7);
      if (tokenValue.startsWith('cxai_')) {
        const hash = crypto.createHash('sha256').update(tokenValue).digest('hex');
        const user = await User.findOne({ apiKeyHash: hash }).select('-passwordHash');
        if (user) {
          req.user = user;
          return next();
        }
      }
    }

    // 2. Fallback to cookie access token
    const token = req.cookies?.access_token;
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
