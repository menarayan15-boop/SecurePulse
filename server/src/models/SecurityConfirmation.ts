import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface ISecurityConfirmationDoc extends Document {
  userId: Types.ObjectId;
  loginHistoryId?: Types.ObjectId;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  operatingSystem: string;
  riskScore: number;
  timestamp: Date;
  status: 'pending' | 'confirmed_legitimate' | 'confirmed_fraudulent';
  actionTaken?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityConfirmationSchema = new Schema<ISecurityConfirmationDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loginHistoryId: {
      type: Schema.Types.ObjectId,
      ref: 'LoginHistory',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: 'Unknown Location',
    },
    device: {
      type: String,
      default: 'Unknown Device',
    },
    browser: {
      type: String,
      default: 'Unknown Browser',
    },
    operatingSystem: {
      type: String,
      default: 'Unknown OS',
    },
    riskScore: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed_legitimate', 'confirmed_fraudulent'],
      default: 'pending',
      index: true,
    },
    actionTaken: {
      type: String,
    },
    confirmedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

SecurityConfirmationSchema.index({ userId: 1, timestamp: -1 });

const MongooseSecurityConfirmation = mongoose.model<ISecurityConfirmationDoc>(
  'SecurityConfirmation',
  SecurityConfirmationSchema
);

export const SecurityConfirmation = createModelProxy<ISecurityConfirmationDoc>(
  MongooseSecurityConfirmation,
  'security_confirmations'
);

