import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';
import { IAccountProtectionEvent } from '../types/index.js';

export interface IAccountProtectionEventDoc extends IAccountProtectionEvent, Document {}

const AccountProtectionEventSchema = new Schema<IAccountProtectionEventDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    browser: {
      type: String,
      default: '',
    },
    actionRequired: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

AccountProtectionEventSchema.index({ userId: 1, createdAt: -1 });

const MongooseAccountProtectionEvent = mongoose.model<IAccountProtectionEventDoc>(
  'AccountProtectionEvent',
  AccountProtectionEventSchema
);

export const AccountProtectionEvent: any = createModelProxy<IAccountProtectionEvent>(
  MongooseAccountProtectionEvent,
  'account_protection_events'
);

