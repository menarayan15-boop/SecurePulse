import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface ISecurityAlertDoc extends Document {
  userId: Types.ObjectId;
  alertType:
    | 'new_browser'
    | 'new_device'
    | 'new_ip'
    | 'new_location'
    | 'suspicious_login'
    | 'impossible_travel'
    | 'otp_success'
    | 'otp_failure'
    | 'multiple_failed_logins'
    | 'password_changed'
    | 'recovery_email_changed'
    | 'device_trusted'
    | 'device_revoked'
    | 'session_terminated'
    | 'emergency_locked'
    | 'account_recovered'
    | 'passkey_registered'
    | 'passkey_removed'
    | 'recovery_codes_generated'
    | 'suspicious_account_modification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  relatedLoginId?: Types.ObjectId;
  readStatus: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const SecurityAlertSchema = new Schema<ISecurityAlertDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
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
    relatedLoginId: {
      type: Schema.Types.ObjectId,
      ref: 'LoginHistory',
    },
    readStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SecurityAlertSchema.index({ userId: 1, createdAt: -1 });

const MongooseSecurityAlert = mongoose.model<ISecurityAlertDoc>('SecurityAlert', SecurityAlertSchema);
export const SecurityAlert: any = createModelProxy(MongooseSecurityAlert, 'security_alerts');
