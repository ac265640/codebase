import { CohereClient } from 'cohere-ai';
import { getCollectionName } from './embedService';
import fs from 'fs';
import path from 'path';
import { getRepoPath } from './gitService';
import { LocalVectorStore } from './localVectorStore';

let _cohere: CohereClient | null = null;

function getCohere(): CohereClient {
  if (!_cohere) _cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  return _cohere;
}

import { generateChatResponse } from './llmProvider';

export interface RAGResult {
  answer: string;
  sources: Array<{ file: string; preview: string }>;
  provider: string;
}

export async function query(
  userId: string,
  repoSlug: string,
  question: string,
): Promise<RAGResult> {
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
  const collection = new LocalVectorStore(collectionName);
  const count = await collection.count();
  if (count === 0) {
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

  // 5. Generate answer using Multi-LLM provider
  const chatResponse = await generateChatResponse(prompt);

  // 6. Build source citations
  const sources = metas
    .filter((m): m is { file: string } => Boolean(m?.file))
    .map(m => ({
      file: m.file,
      preview: chunks[metas.indexOf(m)]?.slice(0, 150) ?? '',
    }));

  return { answer: chatResponse.answer, sources, provider: chatResponse.provider };
}
