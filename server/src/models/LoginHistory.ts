import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface ILoginHistoryDoc extends Document {
  userId: Types.ObjectId;
  ipAddress: string;
  browserName: string;
  browserVersion: string;
  browserEngine?: string;
  operatingSystem: string;
  deviceType: string;
  deviceModel?: string;
  deviceVendor?: string;
  city: string;
  state: string;
  country: string;
  approximateCoordinates: {
    lat: number;
    lng: number;
  };
  loginTimestamp: Date;
  loginStatus: 'success' | 'failed' | 'otp_required' | 'blocked';
  otpStatus: 'not_required' | 'pending' | 'verified' | 'failed';
  riskScore: number;
  riskFactors: string[];
  riskScoreBreakdown?: Array<{ factor: string; weight: number; score: number; description: string }>;
  impossibleTravel?: {
    detected: boolean;
    distanceKm: number;
    speedKmPerHour: number;
    fromLocation: string;
    toLocation: string;
    timeDeltaMinutes: number;
  };
  failureReason?: string;
  isNewDevice: boolean;
  isTrustedDevice: boolean;
  createdAt: Date;
}

const LoginHistorySchema = new Schema<ILoginHistoryDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    browserName: {
      type: String,
      default: 'Unknown Browser',
      index: true,
    },
    browserVersion: {
      type: String,
      default: '',
    },
    browserEngine: {
      type: String,
      default: '',
    },
    operatingSystem: {
      type: String,
      default: 'Unknown OS',
      index: true,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
      index: true,
    },
    deviceModel: {
      type: String,
      default: '',
    },
    deviceVendor: {
      type: String,
      default: '',
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
    approximateCoordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    loginTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    loginStatus: {
      type: String,
      enum: ['success', 'failed', 'otp_required', 'blocked'],
      required: true,
      index: true,
    },
    otpStatus: {
      type: String,
      enum: ['not_required', 'pending', 'verified', 'failed'],
      default: 'not_required',
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskFactors: {
      type: [String],
      default: [],
    },
    riskScoreBreakdown: {
      type: Schema.Types.Mixed,
      default: [],
    },
    impossibleTravel: {
      detected: { type: Boolean, default: false },
      distanceKm: { type: Number, default: 0 },
      speedKmPerHour: { type: Number, default: 0 },
      fromLocation: { type: String, default: '' },
      toLocation: { type: String, default: '' },
      timeDeltaMinutes: { type: Number, default: 0 },
    },
    failureReason: {
      type: String,
    },
    isNewDevice: {
      type: Boolean,
      default: false,
    },
    isTrustedDevice: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

LoginHistorySchema.index({ userId: 1, loginTimestamp: -1 });

const MongooseLoginHistory = mongoose.model<ILoginHistoryDoc>('LoginHistory', LoginHistorySchema);
export const LoginHistory: any = createModelProxy(MongooseLoginHistory, 'login_history');
