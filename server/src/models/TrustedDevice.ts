import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface ITrustedDeviceDoc extends Document {
  userId: Types.ObjectId;
  deviceTokenHash: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  ipAddress: string;
  city: string;
  state: string;
  country: string;
  firstTrustedAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const TrustedDeviceSchema = new Schema<ITrustedDeviceDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
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
    ipAddress: {
      type: String,
      required: true,
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
    firstTrustedAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TrustedDeviceSchema.index({ userId: 1, expiresAt: 1 });

const MongooseTrustedDevice = mongoose.model<ITrustedDeviceDoc>('TrustedDevice', TrustedDeviceSchema);
export const TrustedDevice: any = createModelProxy(MongooseTrustedDevice, 'trusted_devices');
