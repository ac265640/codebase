import { ChromaClient } from 'chromadb';
import { CohereClient } from 'cohere-ai';
import { getCollectionName } from './embedService';
import fs from 'fs';
import path from 'path';
import { getRepoPath } from './gitService';

const CHROMA_PATH = process.env.CHROMA_PERSIST_PATH || './chroma_db';

let _chroma: ChromaClient | null = null;
let _cohere: CohereClient | null = null;

function getChroma(): ChromaClient {
  if (!_chroma) _chroma = new ChromaClient({ path: CHROMA_PATH });
  return _chroma;
}

function getCohere(): CohereClient {
  if (!_cohere) _cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  return _cohere;
}

export interface RAGResult {
  answer: string;
  sources: Array<{ file: string; preview: string }>;
}

export async function query(
  userId: string,
  repoSlug: string,
  question: string,
): Promise<RAGResult> {
  const chroma = getChroma();
  const cohere = getCohere();
  const collectionName = getCollectionName(userId, repoSlug);

  // 1. Embed the question
  const qEmbed = await cohere.embed({
    texts: [question],
    model: 'embed-english-light-v3.0',
    inputType: 'search_query',
  });

  const queryEmbedding = (qEmbed.embeddings as number[][])[0];

  // 2. Retrieve top-5 relevant chunks
  let collection;
  try {
    collection = await chroma.getCollection({ name: collectionName });
  } catch {
    throw new Error('Repository not embedded yet. Please embed it first.');
  }

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 5,
  });

  const chunks = results.documents[0] ?? [];
  const metas = results.metadatas[0] ?? [];

  // 3. Fallback: if no chunks retrieved, use README
  let context = chunks.join('\n\n---\n\n');
  if (!context.trim()) {
    const repoPath = getRepoPath(userId, repoSlug);
    const readmePath = path.join(repoPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      context = fs.readFileSync(readmePath, 'utf-8').slice(0, 4000);
    } else {
      context = 'No relevant code found.';
    }
  }

  // 4. Build RAG prompt
  const prompt = `You are an expert code assistant. A developer is asking about a GitHub repository.

Use ONLY the following code excerpts to answer the question. Be specific and reference file names.
If the answer is not in the provided code, say so clearly — do not guess.

CODE CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

  // 5. Generate answer with Cohere
  const chatResponse = await cohere.chat({
    model: 'command-r',
    message: prompt,
    maxTokens: 800,
  });

  const answer = chatResponse.text;

  // 6. Build source citations
  const sources = metas
    .filter((m): m is { file: string } => Boolean(m?.file))
    .map(m => ({
      file: m.file,
      preview: chunks[metas.indexOf(m)]?.slice(0, 150) ?? '',
    }));

  return { answer, sources };
}
