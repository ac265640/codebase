import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';

const REPOS_DIR = path.resolve(process.env.REPOS_DIR || './repos');

export function getRepoPath(userId: string, repoSlug: string): string {
  return path.join(REPOS_DIR, userId, repoSlug);
}

export async function cloneRepo(userId: string, repoUrl: string, repoSlug: string): Promise<void> {
  const repoPath = getRepoPath(userId, repoSlug);

  if (fs.existsSync(repoPath)) {
    // Repo already cloned — pull latest instead
    const git = simpleGit(repoPath);
    await git.pull();
    return;
  }

  fs.mkdirSync(repoPath, { recursive: true });
  const git = simpleGit();
  await git.clone(repoUrl, repoPath, ['--depth', '1']); // shallow clone for speed
}

export function deleteRepo(userId: string, repoSlug: string): void {
  const repoPath = getRepoPath(userId, repoSlug);
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }
}
