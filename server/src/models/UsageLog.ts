import mongoose, { Document, Schema } from 'mongoose';

export interface IUsageLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  tokensUsed?: number;
  date: string; // YYYY-MM-DD for easy daily grouping
  createdAt: Date;
  updatedAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  tokensUsed: { type: Number, default: 0 },
  date: { type: String, required: true },
}, { timestamps: true });

// Compound index for fast daily queries per user
UsageLogSchema.index({ userId: 1, date: 1, endpoint: 1 });

export const UsageLog = mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);
