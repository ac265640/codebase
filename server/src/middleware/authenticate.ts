import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken } from '../utils/tokens';
import { User } from '../models/User';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let userId: string | null = null;

    // Method 1: httpOnly cookie (standard)
    const cookieToken = req.cookies?.access_token;
    if (cookieToken) {
      try {
        const payload = verifyAccessToken(cookieToken);
        userId = payload.id;
      } catch {
        // Fall through
      }
    }

    // Method 2: Authorization Bearer JWT (fallback for Safari/Firefox strict)
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer cxai_')) {
        const token = authHeader.slice(7);
        try {
          const payload = verifyAccessToken(token);
          userId = payload.id;
        } catch {
          // Fall through
        }
      }
    }

    // Method 3: API Key (cxai_ prefix)
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer cxai_')) {
        const rawKey = authHeader.slice(7);
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const user = await User.findOne({ apiKeyHash: keyHash });
        if (user) {
          userId = user._id.toString();
        }
      }
    }

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(userId).select('-passwordHash -apiKeyHash');
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
