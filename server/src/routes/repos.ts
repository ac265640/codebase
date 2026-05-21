import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { usageLimitRepos } from '../middleware/usageLimit';
import { Repository } from '../models/Repository';
import { cloneRepo, deleteRepo } from '../services/gitService';
import { getEmbeddableFiles, buildFileTree, getFileContent } from '../services/fileService';
import { embedFiles, deleteCollection } from '../services/embedService';
import { emitToUser } from '../services/socketManager';
import { enqueue } from '../utils/jobQueue';

export const reposRouter = Router();
reposRouter.use(authenticate);

// GET /api/repos — list user's repos
reposRouter.get('/', async (req: Request, res: Response) => {
  try {
    const repos = await Repository.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(repos);
  } catch (err) {
    console.error('Error in GET /api/repos:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/repos — clone + embed a new repo
reposRouter.post('/', usageLimitRepos, async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      res.status(400).json({ error: 'repoUrl is required' });
      return;
    }

    // Extract repo name from URL
    const urlParts = repoUrl.replace(/\.git$/, '').split('/');
    const repoName = urlParts[urlParts.length - 1];
    const repoSlug = repoName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (!repoSlug) {
      res.status(400).json({ error: 'Could not parse repo name from URL' });
      return;
    }

    // Check if already exists for this user
    const existing = await Repository.findOne({ userId: req.user._id, repoSlug });
    if (existing) {
      res.status(409).json({ error: 'You already have this repo. Use re-embed to refresh it.' });
      return;
    }

    const repo = await Repository.create({
      userId: req.user._id,
      repoUrl,
      repoName,
      repoSlug,
      embeddingStatus: 'pending',
    });

    // Start background job
    const userId = req.user._id.toString();
    enqueue(`embed_${repo._id}`, {
      userId,
      repoId: repo._id.toString(),
      repoUrl,
      repoSlug,
    });

    res.status(201).json(repo);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/repos/:id — get single repo
reposRouter.get('/:id', async (req: Request, res: Response) => {
  const repo = await Repository.findOne({ _id: req.params.id, userId: req.user._id });
  if (!repo) { res.status(404).json({ error: 'Repo not found' }); return; }
  res.json(repo);
});

// DELETE /api/repos/:id — delete repo + collection
reposRouter.delete('/:id', async (req: Request, res: Response) => {
  const repo = await Repository.findOne({ _id: req.params.id, userId: req.user._id });
  if (!repo) { res.status(404).json({ error: 'Repo not found' }); return; }

  await Repository.findByIdAndDelete(repo._id);
  const userId = req.user._id.toString();
  deleteRepo(userId, repo.repoSlug);
  await deleteCollection(userId, repo.repoSlug);

  res.json({ ok: true });
});

// POST /api/repos/:id/re-embed — re-embed existing repo
reposRouter.post('/:id/re-embed', async (req: Request, res: Response) => {
  const repo = await Repository.findOne({ _id: req.params.id, userId: req.user._id });
  if (!repo) { res.status(404).json({ error: 'Repo not found' }); return; }

  await Repository.findByIdAndUpdate(repo._id, {
    embeddingStatus: 'pending',
    embeddingProgress: 0,
    errorMessage: undefined,
  });

  const userId = req.user._id.toString();
  enqueue(`embed_${repo._id}_${Date.now()}`, {
    userId,
    repoId: repo._id.toString(),
    repoUrl: repo.repoUrl,
    repoSlug: repo.repoSlug,
  });

  res.json({ ok: true, message: 'Re-embedding started' });
});

// GET /api/repos/:id/files — file tree
reposRouter.get('/:id/files', async (req: Request, res: Response) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.id, userId: req.user._id });
    if (!repo) { res.status(404).json({ error: 'Repo not found' }); return; }
    const tree = buildFileTree(req.user._id.toString(), repo.repoSlug);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/repos/:id/file — single file content (?path=src/index.ts)
reposRouter.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.id, userId: req.user._id });
    if (!repo) { res.status(404).json({ error: 'Repo not found' }); return; }
    const filePath = req.query.path as string;
    if (!filePath) { res.status(400).json({ error: 'path query param required' }); return; }
    const content = getFileContent(req.user._id.toString(), repo.repoSlug, filePath);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
