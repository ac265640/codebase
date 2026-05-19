import { CohereClient } from 'cohere-ai';
import dotenv from 'dotenv';
dotenv.config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

async function main() {
  const models = await cohere.models.list();
  for (const model of models.models) {
    if (model.endpoints?.includes('chat')) {
      console.log(model.name);
    }
  }
}

main().catch(console.error);
