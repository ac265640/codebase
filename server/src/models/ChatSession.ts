import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ file: string; preview: string }>;
  provider?: string;
  createdAt: Date;
}

export interface IChatSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  repoId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: [{ file: String, preview: String }],
  provider: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ChatSessionSchema = new Schema<IChatSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  repoId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  title: { type: String, default: 'New Chat' },
  messages: [MessageSchema],
}, { timestamps: true });

ChatSessionSchema.index({ userId: 1, repoId: 1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
