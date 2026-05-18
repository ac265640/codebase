import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { User } from '../models/User';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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
