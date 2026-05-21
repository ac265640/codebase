import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { UsageLog } from '../models/UsageLog';

export const usageRouter = Router();
usageRouter.use(authenticate);

const FREE_LIMITS = { queriesPerDay: 30, totalRepos: 3 };
const PRO_LIMITS  = { queriesPerDay: Infinity, totalRepos: Infinity };

// GET /api/usage/today — today's usage stats
usageRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const log = await UsageLog.findOne({ userId: req.user._id, date: today });
    const plan = req.user.plan || 'free';
    const limits = plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;

    res.json({
      date: today,
      plan,
      queryCount: log?.queryCount ?? 0,
      reposCloned: log?.reposCloned ?? 0,
      limits,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/usage/history — last 30 days of logs
usageRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const logs = await UsageLog.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(30)
      .lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

