import mongoose, { Document, Schema } from 'mongoose';

export interface IUsageLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD for easy daily grouping
  queryCount: number;
  reposCloned: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  queryCount: { type: Number, default: 0 },
  reposCloned: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index for fast daily queries per user
UsageLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UsageLog = mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);
