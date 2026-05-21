import { Request, Response, NextFunction } from 'express';

export function requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!req.user.isEmailVerified) {
    res.status(403).json({ error: 'Email verification required to access this feature' });
    return;
  }
  next();
}
