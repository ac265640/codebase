import { Request, Response, NextFunction } from 'express';

export function requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
  // Bypassed: OTP/verification is disabled; all users are verified.
  next();
}
