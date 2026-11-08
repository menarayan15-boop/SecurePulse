import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';
import { IImpossibleTravelAlert } from '../types/index.js';

export interface IImpossibleTravelAlertDoc extends IImpossibleTravelAlert, Document {}

const ImpossibleTravelAlertSchema = new Schema<IImpossibleTravelAlertDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromCity: {
      type: String,
      default: 'Unknown City',
    },
    fromCountry: {
      type: String,
      default: 'Unknown Country',
    },
    fromCoordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    toCity: {
      type: String,
      default: 'Unknown City',
    },
    toCountry: {
      type: String,
      default: 'Unknown Country',
    },
    toCoordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    timeDeltaMinutes: {
      type: Number,
      required: true,
    },
    speedKmPerHour: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved_user', 'reported_suspicious'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ImpossibleTravelAlertSchema.index({ userId: 1, createdAt: -1 });

const MongooseImpossibleTravelAlert = mongoose.model<IImpossibleTravelAlertDoc>(
  'ImpossibleTravelAlert',
  ImpossibleTravelAlertSchema
);

export const ImpossibleTravelAlert: any = createModelProxy<IImpossibleTravelAlert>(
  MongooseImpossibleTravelAlert,
  'impossible_travel_alerts'
);

