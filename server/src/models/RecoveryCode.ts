import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';
import { IRecoveryCode } from '../types/index.js';

export interface IRecoveryCodeDoc extends IRecoveryCode, Document {}

const RecoveryCodeSchema = new Schema<IRecoveryCodeDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

RecoveryCodeSchema.index({ userId: 1, used: 1 });

const MongooseRecoveryCode = mongoose.model<IRecoveryCodeDoc>('RecoveryCode', RecoveryCodeSchema);

export const RecoveryCode: any = createModelProxy<IRecoveryCode>(
  MongooseRecoveryCode,
  'recovery_codes'
);

