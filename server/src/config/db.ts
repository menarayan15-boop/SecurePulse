import mongoose from 'mongoose';
import {
  isCloudDatabaseConfigured,
  getSafeMaskedDbUri,
  ensureSchemaAndIndexes,
  probeCloudDatabaseHealth,
} from './cloudSync.js';

let cachedPromise: Promise<typeof mongoose> | null = null;
let cloudDbVerified = false;

export async function connectDB(): Promise<void> {
  // Verify authoritative Neon PostgreSQL cloud storage once
  if (!cloudDbVerified && isCloudDatabaseConfigured()) {
    try {
      await ensureSchemaAndIndexes();
      const health = await probeCloudDatabaseHealth();
      if (health.healthy) {
        console.log(
          `[Database] Authoritative Cloud Storage Active: Neon PostgreSQL (${getSafeMaskedDbUri()}) [${health.latencyMs}ms]`
        );
        cloudDbVerified = true;
      } else {
        console.warn(`[Database] Cloud Storage probe warning: ${health.error}`);
      }
    } catch (err: any) {
      console.warn(`[Database] Cloud Storage init notice: ${err.message}`);
    }
  }

  // If MongoDB is already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If already connecting, await the active promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    try {
      await cachedPromise;
      return;
    } catch {
      // Continue to fallback
    }
  }

  const uri = process.env.MONGODB_URI?.trim();

  if (uri) {
    try {
      mongoose.set('strictQuery', false);
      cachedPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await cachedPromise;
      console.log(`[Database] MongoDB Atlas connected successfully to: ${uri.replace(/\/\/.*@/, '//***@')}`);
      return;
    } catch (err: any) {
      cachedPromise = null;
      console.warn(`[Database] Failed to connect to configured MONGODB_URI: ${err.message}`);
    }
  }

  // If running on Vercel or AWS Lambda with no MONGODB_URI, skip local port probe
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log(
      `[Database] Active Mode: Neon PostgreSQL Authoritative Cloud Database (${getSafeMaskedDbUri()}).`
    );
    return;
  }

  // Attempt local MongoDB on 27017 if in local development
  try {
    mongoose.set('strictQuery', false);
    cachedPromise = mongoose.connect('mongodb://127.0.0.1:27017/securepulse', {
      serverSelectionTimeoutMS: 800,
      connectTimeoutMS: 800,
    });
    await cachedPromise;
    console.log('[Database] Connected to local MongoDB instance at mongodb://127.0.0.1:27017/securepulse');
  } catch (localErr) {
    cachedPromise = null;
    console.log(
      `[Database] Active Mode: Neon PostgreSQL Cloud Database (${getSafeMaskedDbUri()}) with local persistent cache.`
    );
  }
}
