import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/authenticate';
import { User } from '../models/User';

export const apiKeyRouter = Router();
apiKeyRouter.use(authenticate);

// GET /api/keys — get user's masked API key
apiKeyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user.apiKeyHash) {
      return res.json({ key: null });
    }
    // Return a masked version of the key. Since we only store the hash, we represent the secret part with dots/asterisks.
    res.json({ key: 'cxai_••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/keys/regenerate — regenerate the API key
apiKeyRouter.post('/regenerate', async (req: Request, res: Response) => {
  try {
    // Generate secure random key: cxai_ + 32 random bytes (64 hex characters)
    const secret = crypto.randomBytes(32).toString('hex');
    const rawKey = `cxai_${secret}`;

    // Hash the key using SHA-256 for fast, standard secure storage
    const apiKeyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Save directly onto User model
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.apiKeyHash = apiKeyHash;
    await user.save();

    // Return the raw key exactly ONCE to the client for display
    res.json({ rawKey });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
