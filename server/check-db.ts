import mongoose from 'mongoose';
import { Repository } from './src/models/Repository';

import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const repos = await Repository.find({});
  console.log('Repos:', repos);
  process.exit(0);
}

main().catch(console.error);
