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
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
