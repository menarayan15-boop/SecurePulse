import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';
import { IPasskeyCredential } from '../types/index.js';

export interface IPasskeyCredentialDoc extends IPasskeyCredential, Document {}

const PasskeyCredentialSchema = new Schema<IPasskeyCredentialDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      default: 0,
    },
    transports: {
      type: [String],
      default: ['internal', 'hybrid'],
    },
    name: {
      type: String,
      required: true,
      default: 'Passkey Credential',
    },
    aaguid: {
      type: String,
      default: '',
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

PasskeyCredentialSchema.index({ userId: 1, createdAt: -1 });

const MongoosePasskeyCredential = mongoose.model<IPasskeyCredentialDoc>(
  'PasskeyCredential',
  PasskeyCredentialSchema
);

export const PasskeyCredential: any = createModelProxy<IPasskeyCredential>(
  MongoosePasskeyCredential,
  'passkey_credentials'
);

