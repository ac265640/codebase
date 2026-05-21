import { ChromaClient } from 'chromadb';
import path from 'path';
import { LocalVectorStore, deleteCollectionFile } from './localVectorStore';

const CHROMA_PATH = path.resolve(
  process.env.CHROMA_PERSIST_PATH || './chroma_db'
);

const chromaEndpoint = process.env.CHROMA_URL;

let chromaClient: ChromaClient | null = null;
let useLocalStore = !chromaEndpoint; // Default to LocalVectorStore immediately if CHROMA_URL is not set

if (chromaEndpoint) {
  try {
    chromaClient = new ChromaClient({ path: chromaEndpoint });
  } catch (err) {
    console.error('Failed to initialize ChromaClient:', err);
    useLocalStore = true;
  }
}

export class ChromaStore {
  private collectionName: string;
  private localStore: LocalVectorStore | null = null;

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

    if (useLocalStore) {
      this.localStore = new LocalVectorStore(this.collectionName);
    }
  }

  private async getCollection() {
    if (useLocalStore) {
      if (!this.localStore) {
        this.localStore = new LocalVectorStore(this.collectionName);
      }
      return null;
    }

    try {
      if (chromaClient) {
        return await chromaClient.getOrCreateCollection({
          name: this.collectionName,
        });
      }
    } catch (err) {
      console.warn('Failed to connect to ChromaDB, falling back to LocalVectorStore:', (err as Error).message);
      useLocalStore = true;
      this.localStore = new LocalVectorStore(this.collectionName);
    }
    return null;
  }

  async upsert({ ids, embeddings, metadatas, documents }: { ids: string[], embeddings: number[][], metadatas: any[], documents: string[] }) {
    const collection = await this.getCollection();
    if (useLocalStore && this.localStore) {
      await this.localStore.upsert({ ids, embeddings, metadatas, documents });
    } else if (collection) {
      await collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents,
      });
    }
  }

  async count() {
    try {
      const collection = await this.getCollection();
      if (useLocalStore && this.localStore) {
        return await this.localStore.count();
      }
      if (collection) {
        return await collection.count();
      }
      return 0;
    } catch (err) {
      console.error('Error counting collection documents:', err);
      return 0;
    }
  }

  async query({ queryEmbeddings, nResults = 5 }: { queryEmbeddings: number[][], nResults?: number }) {
    const collection = await this.getCollection();
    if (useLocalStore && this.localStore) {
      return await this.localStore.query({ queryEmbeddings, nResults });
    }
    if (collection) {
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
    return {
      ids: [[]],
      metadatas: [[]],
      documents: [[]],
      distances: [[]],
    };
  }
}

export async function deleteChromaCollection(collectionName: string) {
  let safeName = collectionName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (!/^[a-z0-9]/.test(safeName)) {
    safeName = 'col_' + safeName;
  }
  safeName = safeName.slice(0, 63);
  while (safeName.length < 3) {
    safeName += '_';
  }

  if (useLocalStore) {
    deleteCollectionFile(safeName);
    return;
  }

  try {
    if (chromaClient) {
      await chromaClient.deleteCollection({ name: safeName });
    }
  } catch (err) {
    console.warn(`Could not delete Chroma collection ${collectionName}, deleting local fallback:`, (err as Error).message);
    deleteCollectionFile(safeName);
  }
}
