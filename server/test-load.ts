import { LocalVectorStore } from './src/services/localVectorStore';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const collectionName = 'u_6a0b9d4e0392ac7ba4f38569_finrag';
  const store = new LocalVectorStore(collectionName);
  const count = await store.count();
  console.log(`Count for ${collectionName}: ${count}`);
}

main().catch(console.error);
