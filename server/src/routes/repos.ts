import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
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
  const repos = await Repository.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(repos);
});

// POST /api/repos — clone + embed a new repo
reposRouter.post('/', async (req: Request, res: Response) => {
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
    enqueue(`embed_${repo._id}`, async () => {
      try {
        // Stage 1: Clone
        await Repository.findByIdAndUpdate(repo._id, { embeddingStatus: 'processing', embeddingProgress: 10 });
        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 10, stage: 'cloning' });

        await cloneRepo(userId, repoUrl, repoSlug);
        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 35, stage: 'cloned' });

        // Stage 2: Parse files
        await Repository.findByIdAndUpdate(repo._id, { embeddingProgress: 40 });
        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 40, stage: 'parsing' });
        const files = await getEmbeddableFiles(userId, repoSlug);

        if (files.length === 0) {
          throw new Error('No embeddable files found in this repository');
        }

        // Stage 3: Embed with progress updates
        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 45, stage: 'embedding' });
        const { fileCount, chunkCount } = await embedFiles(userId, repoSlug, files, (pct) => {
          // Map embed progress (0-100) to overall progress (45-95)
          const overall = 45 + Math.round(pct * 0.5);
          emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: overall, stage: 'embedding' });
        });

        await Repository.findByIdAndUpdate(repo._id, {
          embeddingStatus: 'done',
          embeddingProgress: 100,
          fileCount,
          chunkCount,
          lastEmbeddedAt: new Date(),
        });

        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 100, stage: 'done' });
      } catch (err) {
        await Repository.findByIdAndUpdate(repo._id, {
          embeddingStatus: 'failed',
          errorMessage: String(err),
        });
        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 0, stage: 'failed', error: String(err) });
      }
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
  enqueue(`embed_${repo._id}_${Date.now()}`, async () => {
    try {
      await Repository.findByIdAndUpdate(repo._id, { embeddingStatus: 'processing', embeddingProgress: 10 });
      emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 10, stage: 'cloning' });
      await cloneRepo(userId, repo.repoUrl, repo.repoSlug);

      const files = await getEmbeddableFiles(userId, repo.repoSlug);
      emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 40, stage: 'embedding' });
      const { fileCount, chunkCount } = await embedFiles(userId, repo.repoSlug, files, (pct) => {
        emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 40 + Math.round(pct * 0.55), stage: 'embedding' });
      });

      await Repository.findByIdAndUpdate(repo._id, {
        embeddingStatus: 'done', embeddingProgress: 100, fileCount, chunkCount, lastEmbeddedAt: new Date(),
      });
      emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 100, stage: 'done' });
    } catch (err) {
      await Repository.findByIdAndUpdate(repo._id, { embeddingStatus: 'failed', errorMessage: String(err) });
      emitToUser(userId, 'embed-progress', { repoId: repo._id, progress: 0, stage: 'failed', error: String(err) });
    }
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
