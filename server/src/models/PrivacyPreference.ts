import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface IPrivacyPreferenceDoc extends Document {
  userId: Types.ObjectId;
  loginAlertsEmail: boolean;
  criticalAlertsEmail: boolean;
  travelAlertsEmail: boolean;
  weeklySecurityDigest: boolean;
  dataRetentionDays: number;
  anonymizeIpInLogs: boolean;
  allowSecurityTelemetry: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PrivacyPreferenceSchema = new Schema<IPrivacyPreferenceDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    loginAlertsEmail: {
      type: Boolean,
      default: true,
    },
    criticalAlertsEmail: {
      type: Boolean,
      default: true,
    },
    travelAlertsEmail: {
      type: Boolean,
      default: true,
    },
    weeklySecurityDigest: {
      type: Boolean,
      default: false,
    },
    dataRetentionDays: {
      type: Number,
      default: 90,
    },
    anonymizeIpInLogs: {
      type: Boolean,
      default: false,
    },
    allowSecurityTelemetry: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const MongoosePrivacyPreference = mongoose.model<IPrivacyPreferenceDoc>(
  'PrivacyPreference',
  PrivacyPreferenceSchema
);

export const PrivacyPreference = createModelProxy<IPrivacyPreferenceDoc>(
  MongoosePrivacyPreference,
  'privacy_preferences'
);

