import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface IOTPVerificationDoc extends Document {
  userId: Types.ObjectId;
  otpHash: string;
  deliveryMethod: 'email' | 'sms';
  purpose: 'email_verification' | 'login_verification' | 'password_reset' | 'account_unlock' | 'profile_update';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  resendAvailableAt: Date;
  verifiedAt?: Date;
  usedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const OTPVerificationSchema = new Schema<IOTPVerificationDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms'],
      default: 'email',
    },
    purpose: {
      type: String,
      enum: ['email_verification', 'login_verification', 'password_reset', 'account_unlock', 'profile_update'],
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: automatically deletes document when expiresAt arrives
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
    },
    usedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

OTPVerificationSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

const MongooseOTPVerification = mongoose.model<IOTPVerificationDoc>('OTPVerification', OTPVerificationSchema);
export const OTPVerification: any = createModelProxy(MongooseOTPVerification, 'otp_verifications');
