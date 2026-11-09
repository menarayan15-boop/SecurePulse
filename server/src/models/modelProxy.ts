import mongoose, { Model } from 'mongoose';
import { EmbeddedCollection } from '../config/embeddedStore.js';

export function createModelProxy<T extends Record<string, any>>(
  mongooseModel: Model<any>,
  collectionName: string
): any {
  const fallbackCollection = new EmbeddedCollection<T>(collectionName);

  return new Proxy(mongooseModel, {
    get(target, prop, receiver) {
      // READ: findOne
      if (prop === 'findOne') {
        return function (filter: any) {
          if (mongoose.connection.readyState === 1) {
            const query: any = target.findOne(filter);
            const originalExec = query.exec ? query.exec.bind(query) : null;
            query.exec = async function () {
              if (originalExec) {
                try {
                  const res = await originalExec();
                  if (res) return res;
                } catch {}
              }
              return fallbackCollection.findOne(filter);
            };
            query.then = function (onfulfilled?: any, onrejected?: any) {
              return query.exec().then(onfulfilled, onrejected);
            };
            return query;
          }
          return fallbackCollection.findOne(filter);
        };
      }

      // READ: findById
      if (prop === 'findById') {
        return function (id: any) {
          if (mongoose.connection.readyState === 1) {
            const query: any = target.findById(id);
            const originalExec = query.exec ? query.exec.bind(query) : null;
            query.exec = async function () {
              if (originalExec) {
                try {
                  const res = await originalExec();
                  if (res) return res;
                } catch {}
              }
              return fallbackCollection.findById(id);
            };
            query.then = function (onfulfilled?: any, onrejected?: any) {
              return query.exec().then(onfulfilled, onrejected);
            };
            return query;
          }
          return fallbackCollection.findById(id);
        };
      }

      // WRITE: create
      if (prop === 'create') {
        return async function (data: any) {
          // Pre-assign _id if not already present so both Mongoose and fallback share the identical ID
          if (data && !data._id) {
            data._id = new mongoose.Types.ObjectId().toString();
          }

          // Always mirror into fallbackCollection to keep persistence synchronized
          let fallbackDoc: any = null;
          try {
            fallbackDoc = await fallbackCollection.create(data);
          } catch {}

          if (mongoose.connection.readyState === 1) {
            try {
              return await target.create(data);
            } catch (mongoErr) {
              if (fallbackDoc) return fallbackDoc;
              throw mongoErr;
            }
          }
          return fallbackDoc;
        };
      }

      // WRITE: updateOne
      if (prop === 'updateOne') {
        return async function (filter: any, update: any, options?: any) {
          try {
            await fallbackCollection.updateOne(filter, update);
          } catch {}

          if (mongoose.connection.readyState === 1) {
            return target.updateOne(filter, update, options);
          }
          return { modifiedCount: 1 };
        };
      }

      // WRITE: updateMany
      if (prop === 'updateMany') {
        return async function (filter: any, update: any, options?: any) {
          try {
            await fallbackCollection.updateMany(filter, update);
          } catch {}

          if (mongoose.connection.readyState === 1) {
            return target.updateMany(filter, update, options);
          }
          return { modifiedCount: 1 };
        };
      }

      // If mongoose is connected to a live database, delegate other calls to mongoose
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
