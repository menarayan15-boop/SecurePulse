import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface ISecurityAuditLogDoc extends Document {
  userId: Types.ObjectId;
  action: string;
  eventType: 'auth' | 'device' | 'session' | 'profile' | 'security' | 'lock';
  ipAddress: string;
  browser: string;
  timestamp: Date;
  relevantMetadata: Record<string, any>;
}

const SecurityAuditLogSchema = new Schema<ISecurityAuditLogDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ['auth', 'device', 'session', 'profile', 'security', 'lock'],
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    browser: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    relevantMetadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SecurityAuditLogSchema.index({ userId: 1, timestamp: -1 });

const MongooseSecurityAuditLog = mongoose.model<ISecurityAuditLogDoc>('SecurityAuditLog', SecurityAuditLogSchema);
export const SecurityAuditLog: any = createModelProxy(MongooseSecurityAuditLog, 'security_audit_logs');
