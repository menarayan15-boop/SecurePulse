import mongoose, { Model } from 'mongoose';
import { EmbeddedCollection } from '../config/embeddedStore.js';

export function createModelProxy<T extends Record<string, any>>(
  mongooseModel: Model<any>,
  collectionName: string
): any {
  const fallbackCollection = new EmbeddedCollection<T>(collectionName);

  return new Proxy(mongooseModel, {
    get(target, prop, receiver) {
      // If mongoose is connected to a live database, use mongoose
      if (mongoose.connection.readyState === 1) {
        return Reflect.get(target, prop, receiver);
      }

      // Otherwise, forward to the embedded persistent collection
      if (prop in fallbackCollection) {
        const val = (fallbackCollection as any)[prop];
        if (typeof val === 'function') {
          return val.bind(fallbackCollection);
        }
        return val;
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}
