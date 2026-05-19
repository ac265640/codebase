import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { ApiKey } from '../models/ApiKey';
import { User } from '../models/User';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer codex_')) {
      return res.status(401).json({ error: 'Missing or invalid API key' });
    }

    const rawKey = authHeader.split(' ')[1]; // e.g. codex_XXXXXX.YYYYYYYY
    const keyPrefix = rawKey.substring(0, 14); // codex_ + 8 chars

    // Find keys matching this prefix to avoid comparing against all keys in DB
    const possibleKeys = await ApiKey.find({ keyPrefix });

    let validKey = null;
    for (const apiKey of possibleKeys) {
      const isValid = await bcrypt.compare(rawKey, apiKey.keyHash);
      if (isValid) {
        validKey = apiKey;
        break;
      }
    }

    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Load user and attach to request
    const user = await User.findById(validKey.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    
    // Update last used asynchronously
    validKey.lastUsedAt = new Date();
    validKey.save().catch(console.error);

    next();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
