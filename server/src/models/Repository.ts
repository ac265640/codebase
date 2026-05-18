import mongoose, { Document, Schema } from 'mongoose';

export type EmbedStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface IRepository extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  repoUrl: string;
  repoName: string;
  repoSlug: string;
  embeddingStatus: EmbedStatus;
  embeddingProgress: number;
  fileCount: number;
  chunkCount: number;
  errorMessage?: string;
  lastEmbeddedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  repoUrl: { type: String, required: true },
  repoName: { type: String, required: true },
  repoSlug: { type: String, required: true },
  embeddingStatus: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed'],
    default: 'pending',
  },
  embeddingProgress: { type: Number, default: 0 },
  fileCount: { type: Number, default: 0 },
  chunkCount: { type: Number, default: 0 },
  errorMessage: { type: String },
  lastEmbeddedAt: { type: Date },
}, { timestamps: true });

// One user can't have the same repo slug twice
RepositorySchema.index({ userId: 1, repoSlug: 1 }, { unique: true });

export const Repository = mongoose.model<IRepository>('Repository', RepositorySchema);
