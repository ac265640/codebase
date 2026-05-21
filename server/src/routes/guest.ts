import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { cloneRepo } from '../services/gitService';
import { getEmbeddableFiles, buildFileTree, getFileContent } from '../services/fileService';
import { embedFiles } from '../services/embedService';
import { query } from '../services/ragService';
import crypto from 'crypto';

export const guestRouter = Router();

// Robust client IP key generator to avoid proxy conflation
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
      return forwarded[0].trim();
    }
  }
  return req.ip || req.socket.remoteAddress || 'unknown-ip';
};

// Strict rate limit for guest routes — prevent abuse
const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                    // 20 total requests per IP per hour
  message: { error: 'Guest rate limit reached. Sign up for unlimited access.' },
  keyGenerator: getClientIp,
});

guestRouter.use(guestLimiter);

// Generate a stable guest ID from IP (no persistence needed)
function getGuestId(req: Request): string {
  const ip = getClientIp(req);
  return 'guest_' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// POST /api/guest/repos — clone + embed a repo for guest
guestRouter.post('/repos', async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl is required' });
      return;
    }

    const guestId = getGuestId(req);
    const urlParts = repoUrl.replace(/\.git$/, '').split('/');
    const repoName = urlParts[urlParts.length - 1];
    const repoSlug = repoName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Clone
    await cloneRepo(guestId, repoUrl, repoSlug);

    // Embed
    const files = await getEmbeddableFiles(guestId, repoSlug);
    if (files.length === 0) {
      res.status(400).json({ error: 'No embeddable files found in this repository.' });
      return;
    }
    const { fileCount, chunkCount } = await embedFiles(guestId, repoSlug, files);

    res.json({
      repoSlug,
      repoName,
      fileCount,
      chunkCount,
      guestId,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/guest/repos/:repoSlug/files — file tree
guestRouter.get('/repos/:repoSlug/files', async (req: Request, res: Response) => {
  try {
    const guestId = getGuestId(req);
    const tree = buildFileTree(guestId, req.params.repoSlug);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/guest/repos/:repoSlug/file — file content
guestRouter.get('/repos/:repoSlug/file', async (req: Request, res: Response) => {
  try {
    const guestId = getGuestId(req);
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'path required' });
      return;
    }
    const content = getFileContent(guestId, req.params.repoSlug, filePath);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/guest/chat/:repoSlug — RAG query (no history stored)
guestRouter.post('/chat/:repoSlug', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      res.status(400).json({ error: 'question is required' });
      return;
    }
    const guestId = getGuestId(req);
    const { answer, sources } = await query(guestId, req.params.repoSlug, question);
    res.json({ answer, sources });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
