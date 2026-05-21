import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireEmailVerified } from '../middleware/requireEmailVerified';
import { usageLimitQuery } from '../middleware/usageLimit';
import { trackUsage } from '../middleware/trackUsage';
import { Repository } from '../models/Repository';
import { ChatSession } from '../models/ChatSession';
import { query } from '../services/ragService';

export const chatRouter = Router();
chatRouter.use(authenticate);

// POST /api/chat/:repoId — send a message, get RAG answer
chatRouter.post('/:repoId', requireEmailVerified, usageLimitQuery, trackUsage(150), async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const repo = await Repository.findOne({ _id: req.params.repoId, userId: req.user._id });
    if (!repo) { res.status(404).json({ error: 'Repo not found' }); return; }
    if (repo.embeddingStatus !== 'done') {
      res.status(400).json({ error: 'Repo is not fully embedded yet' });
      return;
    }

    const { answer, sources, provider } = await query(req.user._id.toString(), repo.repoSlug, question);

    // Upsert chat session — one active session per repo
    const userMessage = { role: 'user' as const, content: question, sources: [] as any[], createdAt: new Date() };
    const assistantMessage = { role: 'assistant' as const, content: answer, sources, provider, createdAt: new Date() };

    const session = await ChatSession.findOneAndUpdate(
      { userId: req.user._id, repoId: repo._id },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $setOnInsert: { title: question.slice(0, 60) },
      },
      { upsert: true, new: true },
    );

    res.json({ answer, sources, provider, sessionId: session._id });
  } catch (err: any) {
    const status = err?.status === 503 ? 503 : 500;
    const message = status === 503 ? 'AI service temporarily unavailable' : String(err);
    res.status(status).json({ error: message });
  }
});

// GET /api/chat/:repoId/history — get chat history for a repo
chatRouter.get('/:repoId/history', async (req: Request, res: Response) => {
  const session = await ChatSession.findOne({
    userId: req.user._id,
    repoId: req.params.repoId,
  });
  res.json(session ?? { messages: [] });
});

// DELETE /api/chat/:repoId/history — clear chat history
chatRouter.delete('/:repoId/history', async (req: Request, res: Response) => {
  await ChatSession.findOneAndDelete({ userId: req.user._id, repoId: req.params.repoId });
  res.json({ ok: true });
});
