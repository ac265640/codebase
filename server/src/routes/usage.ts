import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { UsageLog } from '../models/UsageLog';
import { Subscription } from '../models/Subscription';

export const usageRouter = Router();

// GET /api/usage/stats
usageRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get usage for today
    const logs = await UsageLog.find({ userId: req.user._id, date: today });
    const totalTokensToday = logs.reduce((acc, log) => acc + (log.tokensUsed || 0), 0);
    const requestsToday = logs.length;

    // Get subscription limits
    const sub = await Subscription.findOne({ userId: req.user._id });
    const plan = sub?.planId || 'free';
    
    // Define dummy limits
    const limits = {
      free: { requests: 50, tokens: 50000 },
      pro: { requests: 1000, tokens: 5000000 },
    };

    res.json({
      plan,
      usage: {
        today: {
          requests: requestsToday,
          tokens: totalTokensToday,
        }
      },
      limits: limits[plan as 'free' | 'pro'],
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
