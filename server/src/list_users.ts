import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from './models/User';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    return;
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected.');

  const users = await User.find({}).select('email displayName isEmailVerified createdAt');
  console.log('\n--- REGISTERED USERS ---');
  users.forEach(u => {
    console.log(`Email: ${u.email} | Name: ${u.displayName} | Verified: ${u.isEmailVerified} | Created: ${u.createdAt}`);
  });
  console.log('------------------------\n');
  await mongoose.disconnect();
}
run();
