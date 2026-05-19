import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { User } from '../models/User';

export const userRouter = Router();
userRouter.use(authenticate);

// GET /api/user/profile
userRouter.get('/profile', (req: Request, res: Response) => {
  const u = req.user;
  res.json({ id: u!._id, email: u!.email, displayName: u!.displayName, avatar: u!.avatar });
});

// PATCH /api/user/profile
userRouter.patch('/profile', async (req: Request, res: Response) => {
  const { displayName } = req.body;
  if (!displayName?.trim()) {
    res.status(400).json({ error: 'displayName required' });
    return;
  }
  const updated = await User.findByIdAndUpdate(
    req.user!._id,
    { displayName: displayName.trim() },
    { new: true, select: '-passwordHash' }
  );
  res.json(updated);
});
