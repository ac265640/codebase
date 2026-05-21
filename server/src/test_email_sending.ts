import { sendOtpEmail } from './services/emailService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const recipient = 'ac265640@gmail.com';
  console.log(`[TEST] Testing sendOtpEmail to ${recipient}...`);
  try {
    await sendOtpEmail(recipient, '987654');
    console.log('[TEST] SUCCESS!');
  } catch (err) {
    console.error('[TEST] FAILED WITH ERROR:', err);
  }
}
run();
