import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface IActiveSessionDoc extends Document {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  sessionToken: string;
  deviceId?: string;
  ipAddress: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  city: string;
  state: string;
  country: string;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const ActiveSessionSchema = new Schema<IActiveSessionDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      required: true,
    },
    operatingSystem: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      default: 'desktop',
    },
    city: {
      type: String,
      default: 'Unknown City',
    },
    state: {
      type: String,
      default: 'Unknown State',
    },
    country: {
      type: String,
      default: 'Unknown Country',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ActiveSessionSchema.index({ userId: 1, revokedAt: 1 });

const MongooseActiveSession = mongoose.model<IActiveSessionDoc>('ActiveSession', ActiveSessionSchema);
export const ActiveSession: any = createModelProxy(MongooseActiveSession, 'active_sessions');
