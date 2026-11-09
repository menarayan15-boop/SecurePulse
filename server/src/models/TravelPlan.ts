import mongoose, { Schema, Document, Types } from 'mongoose';
import { createModelProxy } from './modelProxy.js';

export interface ITravelPlanDoc extends Document {
  userId: Types.ObjectId;
  destinationCity: string;
  destinationCountry: string;
  startDate: Date;
  endDate: Date;
  purpose?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TravelPlanSchema = new Schema<ITravelPlanDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    destinationCity: {
      type: String,
      required: true,
      trim: true,
    },
    destinationCountry: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    purpose: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

TravelPlanSchema.index({ userId: 1, startDate: 1, endDate: 1 });

const MongooseTravelPlan = mongoose.model<ITravelPlanDoc>('TravelPlan', TravelPlanSchema);

export const TravelPlan = createModelProxy<ITravelPlanDoc>(MongooseTravelPlan, 'travel_plans');

