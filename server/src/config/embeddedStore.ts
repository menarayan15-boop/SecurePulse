import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { SEED_DATA_MAP } from './seedData.js';
import {
  upsertRemoteDoc,
  fetchRemoteCollection,
  deleteRemoteDoc,
  fetchUserByIdentifier,
  fetchRemoteDoc,
  findRemoteDocsByField,
  isCloudDatabaseConfigured,
  ensureSchemaAndIndexes,
  DatabaseError,
} from './cloudSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

declare global {
  // eslint-disable-next-line no-var
  var __SECUREPULSE_GLOBAL_STORE__: Record<string, any[]> | undefined;
}

if (!globalThis.__SECUREPULSE_GLOBAL_STORE__) {
  globalThis.__SECUREPULSE_GLOBAL_STORE__ = {};
}

function resolveDataDir(): string {
  // If running in Vercel or AWS Lambda, local files are read-only; use /tmp cache
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join('/tmp', 'securepulse_data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {}
    }
    return tmpDir;
  }

  const localDir = path.resolve(__dirname, '../../data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const fallbackDir = path.join('/tmp', 'securepulse_data');
    if (!fs.existsSync(fallbackDir)) {
      try {
        fs.mkdirSync(fallbackDir, { recursive: true });
      } catch {}
    }
    return fallbackDir;
  }
}

const DATA_DIR = resolveDataDir();

// Ensure cloud schema on background startup
if (isCloudDatabaseConfigured()) {
  ensureSchemaAndIndexes().catch(() => {});
}

function extractIdentifierFromFilter(filter: any): string | null {
  if (!filter) return null;
  if (typeof filter.email === 'string') return filter.email;
  if (typeof filter.username === 'string') return filter.username;
  if (Array.isArray(filter.$or)) {
    for (const cond of filter.$or) {
      if (cond) {
        if (typeof cond.email === 'string') return cond.email;
        if (typeof cond.username === 'string') return cond.username;
        if (cond.email instanceof RegExp) {
          const clean = cond.email.source.replace(/^\^|\$$|\\/g, '');
          if (clean && !clean.includes('.*')) return clean;
        }
        if (cond.username instanceof RegExp) {
          const clean = cond.username.source.replace(/^\^|\$$|\\/g, '');
          if (clean && !clean.includes('.*')) return clean;
        }
      }
    }
  }
  return null;
}

function extractIdFromFilter(filter: any): string | null {
  if (!filter) return null;
  if (filter._id) return String(filter._id);
  if (filter.id) return String(filter.id);
  return null;
}

export class EmbeddedCollection<T extends Record<string, any>> {
  private filePath: string;
  private collectionName: string;
  private items: T[] = [];

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.load();
  }

  private syncItemIntoCache(item: any): void {
    if (!item || !item._id) return;
    const idStr = String(item._id);
    const idx = this.items.findIndex((i: any) => String(i._id) === idStr);
    if (idx === -1) {
      this.items.push(item);
    } else {
      this.items[idx] = { ...this.items[idx], ...item };
    }
    if (globalThis.__SECUREPULSE_GLOBAL_STORE__) {
      globalThis.__SECUREPULSE_GLOBAL_STORE__[this.collectionName] = this.items;
    }
  }

  private load(): void {
    try {
      let fileLoaded = false;
      if (fs.existsSync(this.filePath)) {
        try {
          const raw = fs.readFileSync(this.filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.items = parsed;
            fileLoaded = true;
          }
        } catch {
          fileLoaded = false;
        }
      }

      if (!fileLoaded) {
        // Look in candidate seed directories
        const candidateSeedDirs = [
          path.resolve(__dirname, '../../data'),
          path.resolve(__dirname, '../data'),
          path.resolve(process.cwd(), 'server/data'),
          path.resolve(process.cwd(), 'data'),
          path.join('/var/task', 'server', 'data'),
          path.join('/var/task', 'data'),
        ];

        let foundSeed = false;
        for (const dir of candidateSeedDirs) {
          const seedPath = path.join(dir, `${this.collectionName}.json`);
          if (fs.existsSync(seedPath)) {
            try {
              const raw = fs.readFileSync(seedPath, 'utf-8');
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                this.items = parsed;
                foundSeed = true;
                break;
              }
            } catch {}
          }
        }

        if (!foundSeed && SEED_DATA_MAP[this.collectionName]) {
          this.items = JSON.parse(JSON.stringify(SEED_DATA_MAP[this.collectionName]));
          foundSeed = true;
        }

        if (!foundSeed && !fileLoaded) {
          if (globalThis.__SECUREPULSE_GLOBAL_STORE__?.[this.collectionName]) {
            this.items = globalThis.__SECUREPULSE_GLOBAL_STORE__[this.collectionName] as T[];
          } else {
            this.items = [];
          }
        }

        this.saveToFile();
      }

      // Populate seed users only if collection is completely empty
      if (SEED_DATA_MAP[this.collectionName] && this.items.length === 0) {
        const seeds = SEED_DATA_MAP[this.collectionName];
        for (const seed of seeds) {
          this.items.push({ ...seed } as any);
        }
        this.saveToFile();
      }

      // Sync into global in-memory store
      if (globalThis.__SECUREPULSE_GLOBAL_STORE__) {
        globalThis.__SECUREPULSE_GLOBAL_STORE__[this.collectionName] = this.items;
      }
    } catch {
      if (!this.items) this.items = [];
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2), 'utf-8');
      if (globalThis.__SECUREPULSE_GLOBAL_STORE__) {
        globalThis.__SECUREPULSE_GLOBAL_STORE__[this.collectionName] = this.items;
      }
    } catch (err) {
      console.warn(`[EmbeddedStore] Notice: Cache write to ${this.filePath} bypassed.`);
    }
  }

  private matchCondition(val: any, cond: any): boolean {
    if (cond instanceof RegExp) {
      return cond.test(String(val || ''));
    }
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      let matched = true;
      if ('$exists' in cond) {
        const exists = val !== undefined && val !== null;
        if (cond.$exists !== exists) return false;
      }
      if ('$in' in cond && Array.isArray(cond.$in)) {
        const valStr = String(val);
        const inList = cond.$in.some(
          (item: any) => String(item) === valStr || (item instanceof RegExp && item.test(valStr))
        );
        if (!inList) return false;
      }
      if ('$gt' in cond) {
        const target = cond.$gt instanceof Date ? cond.$gt.getTime() : cond.$gt;
        const current = val instanceof Date ? val.getTime() : new Date(val).getTime() || val;
        if (!(current > target)) return false;
      }
      if ('$gte' in cond) {
        const target = cond.$gte instanceof Date ? cond.$gte.getTime() : cond.$gte;
        const current = val instanceof Date ? val.getTime() : new Date(val).getTime() || val;
        if (!(current >= target)) return false;
      }
      if ('$lt' in cond) {
        const target = cond.$lt instanceof Date ? cond.$lt.getTime() : cond.$lt;
        const current = val instanceof Date ? val.getTime() : new Date(val).getTime() || val;
        if (!(current < target)) return false;
      }
      if ('$lte' in cond) {
        const target = cond.$lte instanceof Date ? cond.$lte.getTime() : cond.$lte;
        const current = val instanceof Date ? val.getTime() : new Date(val).getTime() || val;
        if (!(current <= target)) return false;
      }
      if ('$ne' in cond) {
        if (String(val) === String(cond.$ne)) return false;
      }
      return matched;
    }
    return String(val) === String(cond);
  }

  private getNestedVal(obj: any, pathStr: string): any {
    const parts = pathStr.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[p];
    }
    return curr;
  }

  private matchFilter(item: any, filter: Record<string, any>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const key of Object.keys(filter)) {
      if (key === '$or') {
        const conditions: any[] = filter.$or;
        const anyPass = conditions.some((cond) => this.matchFilter(item, cond));
        if (!anyPass) return false;
        continue;
      }

      if (key === '$and') {
        const conditions: any[] = filter.$and;
        const allPass = conditions.every((cond) => this.matchFilter(item, cond));
        if (!allPass) return false;
        continue;
      }

      const val = this.getNestedVal(item, key);
      const cond = filter[key];

      if (!this.matchCondition(val, cond)) {
        return false;
      }
    }

    return true;
  }

  private wrapDoc(raw: any): any {
    if (!raw) return null;
    const doc = { ...raw };

    doc._id = String(raw._id);
    doc.id = doc._id;

    const dateKeys = [
      'createdAt',
      'updatedAt',
      'expiresAt',
      'resendAvailableAt',
      'verifiedAt',
      'usedAt',
      'lastActiveAt',
      'lastUsedAt',
      'firstTrustedAt',
      'loginTimestamp',
      'lockedAt',
    ];
    for (const k of dateKeys) {
      if (doc[k] && typeof doc[k] === 'string' && !isNaN(Date.parse(doc[k]))) {
        doc[k] = new Date(doc[k]);
      }
    }

    doc.save = async () => {
      this.load();
      const cleanDoc = { ...doc };
      delete cleanDoc.save;
      delete cleanDoc.toObject;
      delete cleanDoc.id;
      delete cleanDoc.updateOne;
      cleanDoc.updatedAt = new Date();

      if (isCloudDatabaseConfigured()) {
        await upsertRemoteDoc(this.collectionName, doc._id, cleanDoc);
      }

      this.syncItemIntoCache(cleanDoc);
      this.saveToFile();
      return doc;
    };

    doc.updateOne = async (update: Record<string, any>) => {
      return this.updateOne({ _id: doc._id }, update);
    };

    doc.toObject = () => {
      const copy = { ...doc };
      delete copy.save;
      delete copy.toObject;
      delete copy.id;
      delete copy.updateOne;
      return copy;
    };

    return doc;
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    this.load();
    if (isCloudDatabaseConfigured()) {
      try {
        const remote = await fetchRemoteCollection(this.collectionName);
        for (const r of remote) {
          if (r?._id) this.syncItemIntoCache(r);
        }
      } catch {}
    }
    return this.items.filter((item) => this.matchFilter(item, filter)).length;
  }

  async create(data: Partial<T>): Promise<any> {
    this.load();
    const item: any = {
      _id: (data as any)._id || crypto.randomBytes(12).toString('hex'),
      createdAt: (data as any).createdAt || new Date(),
      updatedAt: (data as any).updatedAt || new Date(),
      ...data,
    };

    // Authoritative persistence: AWAIT cloud write first
    if (isCloudDatabaseConfigured()) {
      await upsertRemoteDoc(this.collectionName, item._id, item);
    }

    this.syncItemIntoCache(item);
    this.saveToFile();
    return this.wrapDoc(item);
  }

  async insertMany(docs: Partial<T>[]): Promise<any[]> {
    this.load();
    const created: any[] = [];
    for (const d of docs) {
      const item: any = {
        _id: (d as any)._id || crypto.randomBytes(12).toString('hex'),
        createdAt: (d as any).createdAt || new Date(),
        updatedAt: (d as any).updatedAt || new Date(),
        ...d,
      };
      if (isCloudDatabaseConfigured()) {
        await upsertRemoteDoc(this.collectionName, item._id, item);
      }
      this.syncItemIntoCache(item);
      created.push(this.wrapDoc(item));
    }
    this.saveToFile();
    return created;
  }

  find(filter: Record<string, any> = {}): any {
    this.load();

    const queryObj: any = {
      _sortField: null as string | null,
      _sortDir: -1,
      _skip: 0,
      _limit: 1000,
      _lean: false,

      sort(sortObj: Record<string, number>) {
        const [field, dir] = Object.entries(sortObj)[0] || [];
        if (field) {
          queryObj._sortField = field;
          queryObj._sortDir = dir;
        }
        return queryObj;
      },

      skip(n: number) {
        queryObj._skip = n;
        return queryObj;
      },

      limit(n: number) {
        queryObj._limit = n;
        return queryObj;
      },

      lean() {
        queryObj._lean = true;
        return queryObj;
      },

      select() {
        return queryObj;
      },

      exec() {
        return new Promise((resolve, reject) => queryObj.then(resolve, reject));
      },

      then: async (resolve: (val: any) => void, reject?: (err: any) => void) => {
        try {
          this.load();

          if (isCloudDatabaseConfigured()) {
            try {
              const remote = await fetchRemoteCollection(this.collectionName);
              if (Array.isArray(remote)) {
                for (const r of remote) {
                  if (r?._id) this.syncItemIntoCache(r);
                }
              }
            } catch (syncErr) {
              // If collection query fails, log and fallback to local cache
              console.warn(`[EmbeddedStore] Remote collection sync notice for '${this.collectionName}':`, (syncErr as any).message);
            }
          }

          let res = this.items.filter((item) => this.matchFilter(item, filter));
          if (queryObj._sortField) {
            const f = queryObj._sortField;
            const dir = queryObj._sortDir;
            res.sort((a: any, b: any) => {
              const valA = a[f] instanceof Date ? a[f].getTime() : a[f];
              const valB = b[f] instanceof Date ? b[f].getTime() : b[f];
              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
              return 0;
            });
          }

          if (queryObj._skip > 0) {
            res = res.slice(queryObj._skip);
          }
          if (queryObj._limit > 0) {
            res = res.slice(0, queryObj._limit);
          }

          const wrapped = queryObj._lean ? res : res.map((r) => this.wrapDoc(r));
          resolve(wrapped);
        } catch (err) {
          if (reject) reject(err);
          else throw err;
        }
      },
    };

    return queryObj;
  }

  findOne(filter: Record<string, any> = {}): any {
    this.load();
    const queryObj: any = {
      _sortField: null,
      _sortDir: -1,
      _lean: false,

      sort(sortObj: Record<string, number>) {
        const [field, dir] = Object.entries(sortObj)[0] || [];
        if (field) {
          queryObj._sortField = field;
          queryObj._sortDir = dir;
        }
        return queryObj;
      },

      select() {
        return queryObj;
      },

      lean() {
        queryObj._lean = true;
        return queryObj;
      },

      exec() {
        return new Promise((resolve, reject) => queryObj.then(resolve, reject));
      },

      then: async (resolve: (val: any) => void, reject?: (err: any) => void) => {
        try {
          this.load();

          // 1. Authoritative Neon PostgreSQL lookup for User collection
          if (this.collectionName === 'users' && isCloudDatabaseConfigured()) {
            const identifier = extractIdentifierFromFilter(filter);
            const docId = extractIdFromFilter(filter);

            if (identifier) {
              const remoteUser = await fetchUserByIdentifier(identifier);
              if (remoteUser) {
                this.syncItemIntoCache(remoteUser);
                return resolve(queryObj._lean ? remoteUser : this.wrapDoc(remoteUser));
              }
            } else if (docId) {
              const remoteUser = await fetchRemoteDoc('users', docId);
              if (remoteUser) {
                this.syncItemIntoCache(remoteUser);
                return resolve(queryObj._lean ? remoteUser : this.wrapDoc(remoteUser));
              }
            }
          }

          // 2. Authoritative lookup for OTP or Session by indexed token fields
          if (isCloudDatabaseConfigured()) {
            let remoteMatches: any[] = [];
            if (filter['metadata.challengeToken']) {
              remoteMatches = await findRemoteDocsByField(
                this.collectionName,
                'metadata.challengeToken',
                filter['metadata.challengeToken'],
                20
              );
            } else if (filter['sessionToken']) {
              remoteMatches = await findRemoteDocsByField(this.collectionName, 'sessionToken', filter['sessionToken'], 20);
            } else if (filter['refreshTokenHash']) {
              remoteMatches = await findRemoteDocsByField(
                this.collectionName,
                'refreshTokenHash',
                filter['refreshTokenHash'],
                20
              );
            }

            if (remoteMatches && remoteMatches.length > 0) {
              for (const m of remoteMatches) {
                this.syncItemIntoCache(m);
              }
            }
          }

          // 3. Find matching item in local/synced items that strictly satisfies filter
          let matchedItems = this.items.filter((item) => this.matchFilter(item, filter));
          if (queryObj._sortField && matchedItems.length > 1) {
            const f = queryObj._sortField;
            const dir = queryObj._sortDir;
            matchedItems.sort((a: any, b: any) => {
              const valA = a[f] instanceof Date ? a[f].getTime() : a[f];
              const valB = b[f] instanceof Date ? b[f].getTime() : b[f];
              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
              return 0;
            });
          }
          let raw = matchedItems[0] || null;

          // 4. If not found in cache and cloud DB is configured, sync collection
          if (!raw && isCloudDatabaseConfigured()) {
            try {
              const remote = await fetchRemoteCollection(this.collectionName);
              if (Array.isArray(remote) && remote.length > 0) {
                for (const r of remote) {
                  if (r?._id) this.syncItemIntoCache(r);
                }
                const refreshedMatches = this.items.filter((item) => this.matchFilter(item, filter));
                raw = refreshedMatches[0] || null;
              }
            } catch (err) {
              if (this.collectionName === 'users') {
                throw err;
              }
            }
          }

          const wrapped = raw ? (queryObj._lean ? raw : this.wrapDoc(raw)) : null;
          resolve(wrapped);
        } catch (err) {
          if (reject) reject(err);
          else throw err;
        }
      },
    };

    return queryObj;
  }

  findById(id: any): any {
    return this.findOne({ _id: String(id) });
  }

  async updateOne(filter: Record<string, any>, update: Record<string, any>): Promise<{ modifiedCount: number }> {
    this.load();
    let item = this.items.find((i) => this.matchFilter(i, filter));

    if (!item && isCloudDatabaseConfigured()) {
      const docId = extractIdFromFilter(filter);
      const identifier = extractIdentifierFromFilter(filter);
      if (docId) {
        item = await fetchRemoteDoc(this.collectionName, docId);
      } else if (identifier && this.collectionName === 'users') {
        item = await fetchUserByIdentifier(identifier);
      }
      if (item) {
        this.syncItemIntoCache(item);
      }
    }

    if (!item) return { modifiedCount: 0 };

    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) {
        if (k.includes('.')) {
          const parts = k.split('.');
          let curr: any = item;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
          }
          curr[parts[parts.length - 1]] = v;
        } else {
          (item as any)[k] = v;
        }
      }
    } else {
      Object.assign(item, update);
    }
    (item as any).updatedAt = new Date();

    if (isCloudDatabaseConfigured()) {
      await upsertRemoteDoc(this.collectionName, item._id, item);
    }

    this.syncItemIntoCache(item);
    this.saveToFile();
    return { modifiedCount: 1 };
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>): Promise<{ modifiedCount: number }> {
    this.load();
    if (isCloudDatabaseConfigured()) {
      try {
        const remote = await fetchRemoteCollection(this.collectionName);
        for (const r of remote) {
          if (r?._id) this.syncItemIntoCache(r);
        }
      } catch {}
    }

    let count = 0;
    const modifiedItems: any[] = [];
    for (const item of this.items) {
      if (this.matchFilter(item, filter)) {
        if (update.$set) {
          Object.assign(item, update.$set);
        } else {
          Object.assign(item, update);
        }
        (item as any).updatedAt = new Date();
        modifiedItems.push(item);
        count++;
      }
    }

    if (count > 0 && isCloudDatabaseConfigured()) {
      for (const m of modifiedItems) {
        if (m?._id) {
          await upsertRemoteDoc(this.collectionName, m._id, m);
        }
      }
    }

    if (count > 0) {
      this.saveToFile();
    }
    return { modifiedCount: count };
  }

  async findOneAndUpdate(
    filter: Record<string, any>,
    update: Record<string, any>,
    _options?: Record<string, any>
  ): Promise<any> {
    this.load();
    await this.updateOne(filter, update);
    return this.findOne(filter);
  }

  async deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }> {
    this.load();
    const idx = this.items.findIndex((i) => this.matchFilter(i, filter));
    let targetDoc: any = null;
    if (idx !== -1) {
      targetDoc = this.items.splice(idx, 1)[0];
      this.saveToFile();
    } else if (filter._id) {
      targetDoc = { _id: filter._id };
    }

    if (targetDoc?._id && isCloudDatabaseConfigured()) {
      await deleteRemoteDoc(this.collectionName, targetDoc._id);
      return { deletedCount: 1 };
    }
    return { deletedCount: targetDoc ? 1 : 0 };
  }

  async deleteMany(filter: Record<string, any> = {}): Promise<{ deletedCount: number }> {
    this.load();
    const initialLen = this.items.length;
    const toRemove = this.items.filter((i) => this.matchFilter(i, filter));
    this.items = this.items.filter((i) => !this.matchFilter(i, filter));
    const deletedCount = initialLen - this.items.length;

    if (deletedCount > 0) {
      this.saveToFile();
      if (isCloudDatabaseConfigured()) {
        for (const item of toRemove) {
          if (item?._id) {
            await deleteRemoteDoc(this.collectionName, item._id);
          }
        }
      }
    }
    return { deletedCount };
  }

  async findByIdAndDelete(id: any): Promise<any> {
    const idStr = String(id?._id || id);
    const existing = await this.findOne({ _id: idStr });
    await this.deleteOne({ _id: idStr });
    return existing;
  }
}
