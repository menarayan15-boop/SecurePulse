import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface IPhishingScanDoc extends Document {
  userId: Types.ObjectId;
  scanType: 'url' | 'email' | 'message';
  targetSummary: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  threatIndicators: string[];
  recommendations: string[];
  details?: Record<string, any>;
  createdAt: Date;
}

const PhishingScanSchema = new Schema<IPhishingScanDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scanType: {
      type: String,
      enum: ['url', 'email', 'message'],
      required: true,
    },
    targetSummary: {
      type: String,
      required: true,
    },
    riskScore: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    threatIndicators: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    details: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PhishingScanSchema.index({ userId: 1, createdAt: -1 });

const MongoosePhishingScan = mongoose.model<IPhishingScanDoc>('PhishingScan', PhishingScanSchema);

export const PhishingScan = createModelProxy<IPhishingScanDoc>(
  MongoosePhishingScan,
  'phishing_scans'
);

