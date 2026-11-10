// Remote Authoritative Persistent Storage Synchronization Layer for SecurePulse
// Powered by Neon PostgreSQL Serverless driver with resilient retry and wake-up handling.

import { neon, NeonQueryFunction } from '@neondatabase/serverless';

export class DatabaseError extends Error {
  public code: string;
  public correlationId?: string;

  constructor(message: string, code = 'DATABASE_ERROR', correlationId?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.correlationId = correlationId;
  }
}

// Authoritative production fallback connection string (configured Neon PostgreSQL cluster)
const DEFAULT_NEON_URI =
  'postgresql://neondb_owner:npg_RL1x0eYVSsrc@ep-autumn-band-b5rk8osr-pooler.c-7.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

let cachedSql: NeonQueryFunction<false, false> | null = null;
let cachedConnStr = '';
let schemaInitialized = false;

export function getDatabaseConnectionString(): string {
  const envUri =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    '';

  const uri = envUri.trim() || DEFAULT_NEON_URI;
  return uri;
}

export function getSafeMaskedDbUri(): string {
  const uri = getDatabaseConnectionString();
  try {
    return uri.replace(/\/\/.*@/, '//***:***@');
  } catch {
    return 'postgresql://***:***@neon.tech/neondb';
  }
}

export function isCloudDatabaseConfigured(): boolean {
  return Boolean(getDatabaseConnectionString());
}

export function getAuthoritativeNeonClient(): NeonQueryFunction<false, false> {
  const connStr = getDatabaseConnectionString();
  if (!cachedSql || cachedConnStr !== connStr) {
    cachedSql = neon(connStr);
    cachedConnStr = connStr;
  }
  return cachedSql;
}

// Bounded retry helper with exponential backoff (handles Neon compute wake-up from auto-suspend)
async function executeWithRetry<T>(
  operation: (sql: NeonQueryFunction<false, false>) => Promise<T>,
  opName: string,
  maxRetries = 3
): Promise<T> {
  const sql = getAuthoritativeNeonClient();
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(sql);
    } catch (err: any) {
      lastError = err;
      const isNetworkOrTimeout =
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ECONNREFUSED' ||
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('connection') ||
        err?.['neon:retryable'] === true;

      if (attempt < maxRetries && (isNetworkOrTimeout || attempt === 1)) {
        const backoffMs = attempt * 400 + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      break;
    }
  }

  throw new DatabaseError(
    `Database operation '${opName}' failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown database error'}`,
    'DATABASE_ERROR'
  );
}

// Ensure table and performance indexes exist on startup
export async function ensureSchemaAndIndexes(): Promise<void> {
  if (schemaInitialized) return;
  try {
    const sql = getAuthoritativeNeonClient();
    await sql`
      CREATE TABLE IF NOT EXISTS securepulse_documents (
        collection_name VARCHAR(100) NOT NULL,
        doc_id VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (collection_name, doc_id)
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_sp_docs_col ON securepulse_documents (collection_name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sp_docs_email ON securepulse_documents (collection_name, (lower(data->>'email')));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sp_docs_username ON securepulse_documents (collection_name, (lower(data->>'username')));`;
    schemaInitialized = true;
  } catch (err: any) {
    console.warn(`[CloudSync] Schema verification notice: ${err.message}`);
  }
}

// Fast connectivity probe
export async function probeCloudDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const sql = getAuthoritativeNeonClient();
    await sql`SELECT 1 as ping;`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { healthy: false, latencyMs: Date.now() - start, error: err.message };
  }
}

// Authoritative user lookup by email or username (uses PostgreSQL index scan)
export async function fetchUserByIdentifier(identifier: string): Promise<any | null> {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  return executeWithRetry(async (sql) => {
    const rows = await sql`
      SELECT data FROM securepulse_documents
      WHERE collection_name = 'users'
        AND (lower(data->>'email') = ${clean} OR lower(data->>'username') = ${clean})
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return rows[0].data;
    }
    return null;
  }, 'fetchUserByIdentifier');
}

// Authoritative duplicate check for registration
export async function fetchUserByEmailOrUsername(email: string, username: string): Promise<any[]> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase();

  return executeWithRetry(async (sql) => {
    const rows = await sql`
      SELECT data FROM securepulse_documents
      WHERE collection_name = 'users'
        AND (lower(data->>'email') = ${cleanEmail} OR lower(data->>'username') = ${cleanUsername})
      LIMIT 2;
    `;
    return (rows || []).map((r: any) => r.data).filter(Boolean);
  }, 'fetchUserByEmailOrUsername');
}

// Single document lookup by primary key
export async function fetchRemoteDoc(collectionName: string, docId: string): Promise<any | null> {
  if (!docId) return null;
  const cleanDocId = String(docId);

  return executeWithRetry(async (sql) => {
    const rows = await sql`
      SELECT data FROM securepulse_documents
      WHERE collection_name = ${collectionName} AND doc_id = ${cleanDocId}
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return rows[0].data;
    }
    return null;
  }, `fetchRemoteDoc.${collectionName}`);
}

// Query documents by a top-level or nested JSON field value
export async function findRemoteDocsByField(
  collectionName: string,
  fieldPath: string,
  value: any,
  limit = 100
): Promise<any[]> {
  const strVal = String(value);

  return executeWithRetry(async (sql) => {
    // If fieldPath is nested like "metadata.challengeToken"
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.');
      if (parts.length === 2) {
        const rows = await sql`
          SELECT data FROM securepulse_documents
          WHERE collection_name = ${collectionName}
            AND data->${parts[0]}->>${parts[1]} = ${strVal}
          ORDER BY updated_at DESC
          LIMIT ${limit};
        `;
        return (rows || []).map((r: any) => r.data).filter(Boolean);
      }
    }

    const rows = await sql`
      SELECT data FROM securepulse_documents
      WHERE collection_name = ${collectionName}
        AND data->>${fieldPath} = ${strVal}
      ORDER BY updated_at DESC
      LIMIT ${limit};
    `;
    return (rows || []).map((r: any) => r.data).filter(Boolean);
  }, `findRemoteDocsByField.${collectionName}`);
}

// Read all documents in a collection (used for initial sync or complex aggregations)
export async function fetchRemoteCollection(collectionName: string): Promise<any[]> {
  return executeWithRetry(async (sql) => {
    const rows = await sql`
      SELECT data FROM securepulse_documents
      WHERE collection_name = ${collectionName}
      ORDER BY updated_at DESC;
    `;
    return (rows || []).map((r: any) => r.data).filter(Boolean);
  }, `fetchRemoteCollection.${collectionName}`);
}

// Authoritative upsert document (INSERT ... ON CONFLICT DO UPDATE)
// ALWAYS AWAITED - Guarantees durable cloud persistence before returning
export async function upsertRemoteDoc(collectionName: string, docId: string, data: any): Promise<void> {
  if (!docId || !data) return;
  const cleanDocId = String(docId);

  // Sanitize document object (remove functions and non-serializable fields)
  const cleanDoc = { ...data };
  delete cleanDoc.save;
  delete cleanDoc.toObject;
  delete cleanDoc.id;
  delete cleanDoc.updateOne;

  const dataJson = JSON.stringify(cleanDoc);

  await executeWithRetry(async (sql) => {
    await sql`
      INSERT INTO securepulse_documents (collection_name, doc_id, data, updated_at)
      VALUES (${collectionName}, ${cleanDocId}, ${dataJson}::jsonb, NOW())
      ON CONFLICT (collection_name, doc_id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW();
    `;
  }, `upsertRemoteDoc.${collectionName}`);
}

// Authoritative delete document
export async function deleteRemoteDoc(collectionName: string, docId: string): Promise<void> {
  if (!docId) return;
  const cleanDocId = String(docId);

  await executeWithRetry(async (sql) => {
    await sql`
      DELETE FROM securepulse_documents
      WHERE collection_name = ${collectionName} AND doc_id = ${cleanDocId};
    `;
  }, `deleteRemoteDoc.${collectionName}`);
}
