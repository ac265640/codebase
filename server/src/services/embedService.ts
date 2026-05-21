import { CohereClient } from 'cohere-ai';
import { ParsedFile } from './fileService';
import { ChromaStore, deleteChromaCollection } from './chromaStore';

const BATCH_SIZE = 96; // Cohere embed API limit

// Singleton clients
let _cohere: CohereClient | null = null;

function getCohere(): CohereClient {
  if (!_cohere) _cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  return _cohere;
}

export function getCollectionName(userId: string, repoSlug: string): string {
  const safe = `u_${userId}_${repoSlug}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 63);
  return safe;
}

export async function embedFiles(
  userId: string,
  repoSlug: string,
  files: ParsedFile[],
  onProgress?: (pct: number) => void,
): Promise<{ fileCount: number; chunkCount: number }> {
  const cohere = getCohere();
  const collectionName = getCollectionName(userId, repoSlug);

  // Delete existing collection if re-embedding
  await deleteChromaCollection(collectionName);

  const collection = new ChromaStore(collectionName);
  let embedded = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    const embedResponse = await cohere.embed({
      texts: batch.map(f => f.content),
      model: 'embed-english-light-v3.0',
      inputType: 'search_document',
    });

    const embeddings = embedResponse.embeddings as number[][];

    await collection.upsert({
      ids: batch.map((f, idx) => `${i + idx}_${f.path}`),
      embeddings,
      documents: batch.map(f => f.content),
      metadatas: batch.map(f => ({ file: f.path })),
    });

    embedded += batch.length;
    if (onProgress) {
      onProgress(Math.round((embedded / files.length) * 100));
    }
  }

  return { fileCount: files.length, chunkCount: embedded };
}

export async function deleteCollection(userId: string, repoSlug: string): Promise<void> {
  await deleteChromaCollection(getCollectionName(userId, repoSlug));
}
