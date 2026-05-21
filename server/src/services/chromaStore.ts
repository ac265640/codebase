import { ChromaClient } from 'chromadb';
import path from 'path';

const CHROMA_PATH = path.resolve(
  process.env.CHROMA_PERSIST_PATH || './chroma_db'
);

const chromaEndpoint = process.env.CHROMA_URL || 
  (CHROMA_PATH.startsWith('http://') || CHROMA_PATH.startsWith('https://') ? CHROMA_PATH : 'http://localhost:8000');

export const chromaClient = new ChromaClient({ path: chromaEndpoint });

export class ChromaStore {
  private collectionName: string;

  constructor(collectionName: string) {
    // ChromaDB collection names must be 3-63 characters long, alphanumeric/hyphen/underscore, start/end with alphanumeric
    let safeName = collectionName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    
    // Ensure it starts with alphanumeric
    if (!/^[a-z0-9]/.test(safeName)) {
      safeName = 'col_' + safeName;
    }
    
    // Limit length to 63
    this.collectionName = safeName.slice(0, 63);
    
    // Ensure it is at least 3 chars
    while (this.collectionName.length < 3) {
      this.collectionName += '_';
    }
  }

  private async getCollection() {
    return await chromaClient.getOrCreateCollection({
      name: this.collectionName,
    });
  }

  async upsert({ ids, embeddings, metadatas, documents }: { ids: string[], embeddings: number[][], metadatas: any[], documents: string[] }) {
    const collection = await this.getCollection();
    // Prepare documents & metadatas to match ChromaDB upsert signature
    await collection.upsert({
      ids,
      embeddings,
      metadatas,
      documents,
    });
  }

  async count() {
    try {
      const collection = await this.getCollection();
      return await collection.count();
    } catch (err) {
      console.error('Error counting collection documents:', err);
      return 0;
    }
  }

  async query({ queryEmbeddings, nResults = 5 }: { queryEmbeddings: number[][], nResults?: number }) {
    const collection = await this.getCollection();
    const res = await collection.query({
      queryEmbeddings,
      nResults,
    });
    
    return {
      ids: res.ids || [[]],
      metadatas: res.metadatas || [[]],
      documents: res.documents || [[]],
      distances: res.distances || [[]],
    };
  }
}

export async function deleteChromaCollection(collectionName: string) {
  try {
    let safeName = collectionName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!/^[a-z0-9]/.test(safeName)) {
      safeName = 'col_' + safeName;
    }
    safeName = safeName.slice(0, 63);
    while (safeName.length < 3) {
      safeName += '_';
    }
    await chromaClient.deleteCollection({ name: safeName });
  } catch (err) {
    // If it doesn't exist, we can ignore the deletion error safely
    console.warn(`Could not delete Chroma collection ${collectionName}:`, (err as Error).message);
  }
}
