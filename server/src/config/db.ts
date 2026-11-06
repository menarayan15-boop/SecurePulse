import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      mongoose.set('strictQuery', false);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[Database] MongoDB Atlas connected successfully to: ${uri.replace(/\/\/.*@/, '//***@')}`);
      return;
    } catch (err: any) {
      console.warn(`[Database] Failed to connect to configured MONGODB_URI: ${err.message}`);
    }
  }

  // Attempt local MongoDB on 27017 if no Atlas URI or if local dev
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect('mongodb://127.0.0.1:27017/securepulse', {
      serverSelectionTimeoutMS: 1500,
    });
    console.log('[Database] Connected to local MongoDB instance at mongodb://127.0.0.1:27017/securepulse');
  } catch (localErr) {
    console.log('[Database] Local MongoDB not running on 27017.');
    console.log('[Database] Active Mode: Embedded Persistent Storage (server/data/*.json).');
    console.log('[Database] All users, sessions, login logs, and alerts are persisted to disk automatically.');
    console.log('[Database] To connect to MongoDB Atlas, set MONGODB_URI in server/.env');
  }
}
