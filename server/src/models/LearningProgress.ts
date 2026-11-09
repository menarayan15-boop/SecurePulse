import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface IQuizAttempt {
  quizId: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

export interface ILearningProgressDoc extends Document {
  userId: Types.ObjectId;
  completedModules: string[];
  quizAttempts: IQuizAttempt[];
  totalPoints: number;
  badges: string[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LearningProgressSchema = new Schema<ILearningProgressDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    completedModules: {
      type: [String],
      default: [],
    },
    quizAttempts: [
      {
        quizId: { type: String, required: true },
        score: { type: Number, required: true },
        totalQuestions: { type: Number, required: true },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    totalPoints: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseLearningProgress = mongoose.model<ILearningProgressDoc>(
  'LearningProgress',
  LearningProgressSchema
);

export const LearningProgress = createModelProxy<ILearningProgressDoc>(
  MongooseLearningProgress,
  'learning_progress'
);

