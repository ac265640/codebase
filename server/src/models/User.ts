import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  displayName: string;
  avatar?: string;
  googleId?: string;
  isEmailVerified: boolean;
  otpCode?: string;
  otpExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  otpResendCount?: number;
  otpResendWindowStart?: Date;
  apiKeyHash?: string;
  plan: 'free' | 'pro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String }, // Optional for Google Auth users
  displayName: { type: String, required: true, trim: true },
  avatar: { type: String },
  googleId: { type: String, sparse: true, unique: true },
  isEmailVerified: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpiresAt: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpiry: { type: Date },
  otpResendCount: { type: Number, default: 0 },
  otpResendWindowStart: { type: Date },
  apiKeyHash: { type: String, unique: true, sparse: true },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
