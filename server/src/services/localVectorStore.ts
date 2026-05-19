import fs from 'fs';
import path from 'path';

interface VectorDoc {
  id: string;
  embedding: number[];
  metadata: any;
  document: string;
}

const STORE_DIR = process.env.CHROMA_PERSIST_PATH || './chroma_db';

export class LocalVectorStore {
  private collectionName: string;
  private filePath: string;
  private docs: VectorDoc[] = [];

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.filePath = path.join(STORE_DIR, `${collectionName}.json`);
    this.load();
  }

  private load() {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (fs.existsSync(this.filePath)) {
      try {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.docs = JSON.parse(data);
      } catch (err) {
        this.docs = [];
      }
    }
  }

  private save() {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.docs));
  }

  async upsert({ ids, embeddings, metadatas, documents }: { ids: string[], embeddings: number[][], metadatas: any[], documents: string[] }) {
    for (let i = 0; i < ids.length; i++) {
      const existingIdx = this.docs.findIndex(d => d.id === ids[i]);
      const newDoc = {
        id: ids[i],
        embedding: embeddings[i],
        metadata: metadatas[i],
        document: documents[i]
      };
      
      if (existingIdx >= 0) {
        this.docs[existingIdx] = newDoc;
      } else {
        this.docs.push(newDoc);
      }
    }
    this.save();
  }

  async count() {
    return this.docs.length;
  }

  async query({ queryEmbeddings, nResults = 5 }: { queryEmbeddings: number[][], nResults?: number }) {
    // We only handle single query embedding for simplicity
    const query = queryEmbeddings[0];
    
    const results = this.docs.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(query, doc.embedding)
    }));
    
    results.sort((a, b) => b.score - a.score); // Higher score is better
    const topResults = results.slice(0, nResults);
    
    return {
      ids: [topResults.map(r => r.id)],
      metadatas: [topResults.map(r => r.metadata)],
      documents: [topResults.map(r => r.document)],
      // Return 1 - score because chroma returns distance where 0 is perfect match
      distances: [topResults.map(r => 1 - r.score)] 
    };
  }

  private cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export function deleteCollectionFile(collectionName: string) {
  const filePath = path.join(STORE_DIR, `${collectionName}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
