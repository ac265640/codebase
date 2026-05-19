import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authenticate';
import { ApiKey } from '../models/ApiKey';

export const apiKeyRouter = Router();
apiKeyRouter.use(authenticate);

// GET /api/keys — list user's keys
apiKeyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const keys = await ApiKey.find({ userId: req.user._id })
      .select('-keyHash') // Do not send hash to frontend
      .sort({ createdAt: -1 });
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/keys — generate a new key
apiKeyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    // Generate secure random key: codex_[8_char_prefix].[32_char_secret]
    const prefix = crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(16).toString('hex');
    const rawKey = `codex_${prefix}.${secret}`;
    const keyPrefix = `codex_${prefix}`;

    // Hash it for storage
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await ApiKey.create({
      userId: req.user._id,
      name,
      keyPrefix,
      keyHash,
    });

    // We only return the raw key ONCE upon creation
    res.status(201).json({
      key: {
        id: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
      },
      rawKey,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/keys/:id — revoke a key
apiKeyRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const key = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    
    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ ok: true, message: 'Key revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
