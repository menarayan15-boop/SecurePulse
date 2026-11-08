import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/index.js';
import { createModelProxy } from './modelProxy.js';

export interface UserDocument extends IUser, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    themePreference: {
      type: String,
      enum: ['auto', 'light', 'dark'],
      default: 'auto',
    },
    themeOverride: {
      type: Boolean,
      default: false,
    },
    securitySettings: {
      trustedDeviceDurationDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365,
      },
      allowEmailAlerts: {
        type: Boolean,
        default: true,
      },
      allowSmsAlerts: {
        type: Boolean,
        default: false,
      },
      highRiskOtpEnforced: {
        type: Boolean,
        default: true,
      },
      unfamiliarDeviceOtpEnforced: {
        type: Boolean,
        default: true,
      },
    },
    accountStatus: {
      type: String,
      enum: ['active', 'locked', 'suspended'],
      default: 'active',
      index: true,
    },
    recoveryEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    recoveryEmailVerified: {
      type: Boolean,
      default: false,
    },
    preferredAuthMethod: {
      type: String,
      enum: ['password', 'passkey'],
      default: 'password',
    },
    lockedAt: {
      type: Date,
    },
    lockReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseUser = mongoose.model<UserDocument>('User', UserSchema);
export const User: any = createModelProxy<IUser>(MongooseUser, 'users');
