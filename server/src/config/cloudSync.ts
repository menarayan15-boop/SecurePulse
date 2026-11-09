// Remote Persistent Storage Synchronization Layer for Serverless Vercel Deployments
// Ensures that users, sessions, and verification records persist across ephemeral Lambda instances.

function getDatabaseConfig(): { host: string; connectionString: string } | null {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    '';

  if (!connectionString) return null;

  let host = process.env.NEON_HOST || '';
  if (!host) {
    try {
      const normalized = connectionString.startsWith('postgres')
        ? connectionString.replace(/^postgres(ql)?:\/\//, 'http://')
        : connectionString;
      const parsed = new URL(normalized);
      // Remove -pooler suffix for the HTTP /sql compute endpoint
      host = parsed.hostname.replace('-pooler', '');
    } catch {
      host = '';
    }
  }

  if (!host) return null;
  return { host, connectionString };
}

export async function fetchRemoteCollection(collectionName: string): Promise<any[]> {
  const config = getDatabaseConfig();
  if (!config) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`https://${config.host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': config.connectionString,
      },
      body: JSON.stringify({
        query: `SELECT data FROM securepulse_documents WHERE collection_name = '${collectionName.replace(/'/g, "''")}';`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json: any = await res.json();
    const rows = Array.isArray(json) ? json : json.rows || [];
    return rows.map((r: any) => r.data).filter(Boolean);
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

export async function upsertRemoteDoc(collectionName: string, docId: string, data: any): Promise<void> {
  const config = getDatabaseConfig();
  if (!config || !docId) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Sanitize data string for SQL insertion
    const cleanDoc = { ...data };
    delete cleanDoc.save;
    delete cleanDoc.toObject;
    delete cleanDoc.id;
    delete cleanDoc.updateOne;

    const dataJson = JSON.stringify(cleanDoc).replace(/'/g, "''");
    const query = `
      INSERT INTO securepulse_documents (collection_name, doc_id, data)
      VALUES ('${collectionName.replace(/'/g, "''")}', '${String(docId).replace(/'/g, "''")}', '${dataJson}'::jsonb)
      ON CONFLICT (collection_name, doc_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
    `;

    await fetch(`https://${config.host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': config.connectionString,
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timeoutId);
  } catch {
    clearTimeout(timeoutId);
  }
}

export async function deleteRemoteDoc(collectionName: string, docId: string): Promise<void> {
  const config = getDatabaseConfig();
  if (!config || !docId) return;

  try {
    const query = `DELETE FROM securepulse_documents WHERE collection_name = '${collectionName.replace(/'/g, "''")}' AND doc_id = '${String(docId).replace(/'/g, "''")}';`;
    fetch(`https://${config.host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': config.connectionString,
      },
      body: JSON.stringify({ query }),
    }).catch(() => {});
  } catch {}
}
