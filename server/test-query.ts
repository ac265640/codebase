import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { query } from './src/services/ragService';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  try {
    const res = await query('6a0b9d4e0392ac7ba4f38569', 'finrag', 'What does this repo do?');
    console.log(res);
  } catch (err) {
    console.error('ERROR TRACE:', err);
  }
  process.exit(0);
}

main().catch(console.error);
