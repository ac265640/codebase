import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { getRepoPath } from './gitService';

// File types to embed — mirrors the original Python version
const SUPPORTED_EXTENSIONS = [
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.cs',
  '.go', '.rb', '.php', '.swift', '.kt', '.rs', '.md', '.txt',
  '.json', '.yaml', '.yml', '.toml', '.env.example', '.ipynb',
];

export interface ParsedFile {
  path: string;       // relative path from repo root
  content: string;    // text content to embed
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

export async function getEmbeddableFiles(userId: string, repoSlug: string): Promise<ParsedFile[]> {
  const repoPath = getRepoPath(userId, repoSlug);
  const files: ParsedFile[] = [];

  const patterns = SUPPORTED_EXTENSIONS.map(ext => `**/*${ext}`);
  const matches = await glob(patterns, {
    cwd: repoPath,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/__pycache__/**', '**/venv/**'],
    nodir: true,
  });

  for (const match of matches) {
    const fullPath = path.join(repoPath, match);
    try {
      let content: string;

      if (match.endsWith('.ipynb')) {
        // Extract only code cells from Jupyter notebooks — raw JSON is noise
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const notebook = JSON.parse(raw);
        const cells: any[] = Array.isArray(notebook.cells) ? notebook.cells : [];
        content = cells
          .filter((cell: any) => cell?.cell_type === 'code')
          .map((cell: any) => {
            // source can be a string or an array of strings
            if (Array.isArray(cell.source)) return cell.source.join('');
            return typeof cell.source === 'string' ? cell.source : '';
          })
          .join('\n\n');
      } else {
        content = fs.readFileSync(fullPath, 'utf-8');
      }

      // Skip empty files
      if (content.trim().length === 0) continue;
      // Skip very large files (> 100KB) — ChromaDB has token limits
      if (Buffer.byteLength(content, 'utf-8') > 100 * 1024) continue;

      files.push({ path: match, content });
    } catch {
      // Skip unreadable files silently
    }
  }

  return files;
}

export function buildFileTree(userId: string, repoSlug: string): FileTreeNode {
  const repoPath = getRepoPath(userId, repoSlug);
  return buildNode(repoPath, repoPath);
}

function buildNode(fullPath: string, rootPath: string): FileTreeNode {
  const name = path.basename(fullPath);
  const relativePath = path.relative(rootPath, fullPath);
  const stat = fs.statSync(fullPath);

  if (!stat.isDirectory()) {
    return { name, path: relativePath, type: 'file' };
  }

  const IGNORE_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'dist', 'venv', '.next']);

  const children = fs.readdirSync(fullPath)
    .filter(child => !IGNORE_DIRS.has(child))
    .map(child => buildNode(path.join(fullPath, child), rootPath))
    .sort((a, b) => {
      // Directories first, then files, both alphabetical
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return { name, path: relativePath || '.', type: 'directory', children };
}

export function getFileContent(userId: string, repoSlug: string, filePath: string): string {
  const repoPath = getRepoPath(userId, repoSlug);
  // Security: prevent path traversal
  const resolved = path.resolve(repoPath, filePath);
  if (!resolved.startsWith(path.resolve(repoPath))) {
    throw new Error('Path traversal attempt blocked');
  }
  return fs.readFileSync(resolved, 'utf-8');
}
