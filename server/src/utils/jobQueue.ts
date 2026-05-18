// In-process async job queue. No Redis needed. Works on Render free tier.
// Jobs run one at a time. Failed jobs don't block the queue.

type JobFn = () => Promise<void>;

interface Job {
  id: string;
  fn: JobFn;
  status: 'queued' | 'running' | 'done' | 'failed';
  error?: string;
  createdAt: number;
}

const queue: Job[] = [];
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  const job = queue.find(j => j.status === 'queued');
  if (!job) return;

  running = true;
  job.status = 'running';

  try {
    await job.fn();
    job.status = 'done';
  } catch (err) {
    job.status = 'failed';
    job.error = String(err);
    console.error(`Job ${job.id} failed:`, err);
  } finally {
    running = false;
    setTimeout(tick, 300);
  }
}

export function enqueue(id: string, fn: JobFn): void {
  // Prevent duplicate jobs for same id
  if (queue.find(j => j.id === id && j.status !== 'failed' && j.status !== 'done')) {
    return;
  }
  queue.push({ id, fn, status: 'queued', createdAt: Date.now() });
  tick();
}

// Clean stale jobs every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (let i = queue.length - 1; i >= 0; i--) {
    if ((queue[i].status === 'done' || queue[i].status === 'failed')
        && queue[i].createdAt < cutoff) {
      queue.splice(i, 1);
    }
  }
}, 10 * 60 * 1000);
