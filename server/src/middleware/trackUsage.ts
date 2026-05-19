import { Request, Response, NextFunction } from 'express';
import { UsageLog } from '../models/UsageLog';
import { Subscription } from '../models/Subscription';

// Simple middleware to track API usage and enforce basic limits
export const trackUsage = (tokensPerRequest: number = 100) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const userId = req.user._id;

      // Check current usage
      const logs = await UsageLog.find({ userId, date: today });
      const requestsToday = logs.length;

      // Get subscription limits
      const sub = await Subscription.findOne({ userId });
      const plan = sub?.planId || 'free';
      
      const limit = plan === 'pro' ? 1000 : 50;

      if (requestsToday >= limit) {
        return res.status(429).json({ error: `Daily limit of ${limit} requests reached for ${plan} plan. Please upgrade.` });
      }

      // Log usage asynchronously (don't block the request)
      UsageLog.create({
        userId,
        endpoint: req.originalUrl,
        tokensUsed: tokensPerRequest,
        date: today,
      }).catch(err => console.error('Error logging usage:', err));

      next();
    } catch (err) {
      console.error('Usage tracking error:', err);
      next(); // Fail open so we don't break the app
    }
  };
};
