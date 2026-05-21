import { Request, Response, NextFunction } from 'express';
import { UsageLog } from '../models/UsageLog';
import { User } from '../models/User';

const FREE_PLAN_LIMITS = {
  queriesPerDay: 30,
  totalRepos: 3,
};

/**
 * usageLimitQuery — middleware to enforce daily query limits
 * Blocks requests when free-plan users exceed 30 queries/day.
 */
export async function usageLimitQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    // Pro users have unlimited access
    if (user.plan === 'pro') return next();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
    const log = await UsageLog.findOne({ userId: user._id, date: today });
    const queryCount = log?.queryCount ?? 0;

    if (queryCount >= FREE_PLAN_LIMITS.queriesPerDay) {
      res.status(429).json({
        error: `Daily query limit of ${FREE_PLAN_LIMITS.queriesPerDay} reached for the free plan.`,
        limit: FREE_PLAN_LIMITS.queriesPerDay,
        used: queryCount,
        plan: 'free',
        upgradeUrl: `${process.env.CLIENT_URL}/settings`,
      });
      return;
    }

    // Atomically increment query count
    await UsageLog.findOneAndUpdate(
      { userId: user._id, date: today },
      { $inc: { queryCount: 1 } },
      { upsert: true },
    );

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * usageLimitRepos — middleware to enforce repo cloning limits
 * Blocks requests when free-plan users already have 3+ repos.
 */
export async function usageLimitRepos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    // Pro users have unlimited access
    if (user.plan === 'pro') return next();

    // Count total repos for this user
    const { Repository } = await import('../models/Repository');
    const repoCount = await Repository.countDocuments({ userId: user._id });

    if (repoCount >= FREE_PLAN_LIMITS.totalRepos) {
      res.status(429).json({
        error: `Free plan is limited to ${FREE_PLAN_LIMITS.totalRepos} repositories.`,
        limit: FREE_PLAN_LIMITS.totalRepos,
        used: repoCount,
        plan: 'free',
        upgradeUrl: `${process.env.CLIENT_URL}/settings`,
      });
      return;
    }

    // Track the clone
    const today = new Date().toISOString().split('T')[0];
    await UsageLog.findOneAndUpdate(
      { userId: user._id, date: today },
      { $inc: { reposCloned: 1 } },
      { upsert: true },
    );

    next();
  } catch (err) {
    next(err);
  }
}
