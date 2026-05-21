import crypto from 'crypto';
import { User } from '../models/User';

export function generateOtp(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOtp(userId: string, rawOtp: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await User.findByIdAndUpdate(userId, { otpCode: hash, otpExpiresAt: expiry });
}

export async function verifyOtp(userId: string, rawOtp: string): Promise<boolean> {
  const user = await User.findById(userId).select('otpCode otpExpiresAt');
  if (!user?.otpCode || !user?.otpExpiresAt) return false;
  if (user.otpExpiresAt < new Date()) return false;
  const hash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  if (user.otpCode !== hash) return false;
  // Invalidate after successful verify
  await User.findByIdAndUpdate(userId, {
    $unset: { otpCode: '', otpExpiresAt: '' }
  });
  return true;
}
