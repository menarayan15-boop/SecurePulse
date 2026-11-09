import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { SEED_DATA_MAP } from './seedData.js';
import { upsertRemoteDoc, fetchRemoteCollection, deleteRemoteDoc } from './cloudSync.js';

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
  // If running in Vercel or AWS Lambda, the local files are read-only; use /tmp
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
    // If local dir fails with EROFS (read-only filesystem), fallback to /tmp
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

export class EmbeddedCollection<T extends Record<string, any>> {
  private filePath: string;
  private collectionName: string;
  private items: T[] = [];

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.load();
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

      // Always guarantee verified seed users are present in the collection
      if (SEED_DATA_MAP[this.collectionName]) {
        const seeds = SEED_DATA_MAP[this.collectionName];
        let addedAny = false;
        for (const seed of seeds) {
          const exists = this.items.some(
            (item: any) =>
              String(item._id) === String(seed._id) ||
              (item.email && seed.email && String(item.email).toLowerCase() === String(seed.email).toLowerCase())
          );
          if (!exists) {
            this.items.push({ ...seed } as any);
            addedAny = true;
          }
        }
        if (addedAny) {
          this.saveToFile();
        }
      }

      // Sync into global in-memory store
      if (globalThis.__SECUREPULSE_GLOBAL_STORE__) {
        globalThis.__SECUREPULSE_GLOBAL_STORE__[this.collectionName] = this.items;
      }
    } catch (err) {
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
      console.error(`[EmbeddedStore] Failed to write ${this.filePath}:`, err);
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
      const idx = this.items.findIndex((i: any) => String(i._id) === String(doc._id));
      if (idx !== -1) {
        this.items[idx] = { ...doc };
        delete this.items[idx].save;
        delete this.items[idx].toObject;
        delete this.items[idx].id;
        delete this.items[idx].updateOne;
        this.saveToFile();
        upsertRemoteDoc(this.collectionName, doc._id, this.items[idx]).catch(() => {});
      } else {
        const copy = { ...doc };
        delete copy.save;
        delete copy.toObject;
        delete copy.id;
        delete copy.updateOne;
        this.items.push(copy);
        this.saveToFile();
        upsertRemoteDoc(this.collectionName, doc._id, copy).catch(() => {});
      }
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
    this.items.push(item);
    this.saveToFile();
    upsertRemoteDoc(this.collectionName, item._id, item).catch(() => {});
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
      this.items.push(item);
      created.push(this.wrapDoc(item));
      upsertRemoteDoc(this.collectionName, item._id, item).catch(() => {});
    }
    this.saveToFile();
    return created;
  }

  find(filter: Record<string, any> = {}): any {
    this.load();
    let matched = this.items.filter((item) => this.matchFilter(item, filter));

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

      then: (resolve: (val: any) => void, reject?: (err: any) => void) => {
        try {
          this.load();
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

      then: (resolve: (val: any) => void, reject?: (err: any) => void) => {
        try {
          this.load();
          let raw = this.items.find((item) => this.matchFilter(item, filter));
          if (!raw && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
            fetchRemoteCollection(this.collectionName).then((remoteItems) => {
              if (Array.isArray(remoteItems) && remoteItems.length > 0) {
                let merged = false;
                for (const r of remoteItems) {
                  if (r && r._id && !this.items.some((i: any) => String(i._id) === String(r._id))) {
                    this.items.push(r);
                    merged = true;
                  }
                }
                if (merged) {
                  this.saveToFile();
                  raw = this.items.find((item) => this.matchFilter(item, filter));
                }
              }
              const wrapped = raw ? (queryObj._lean ? raw : this.wrapDoc(raw)) : null;
              resolve(wrapped);
            }).catch(() => {
              const wrapped = raw ? (queryObj._lean ? raw : this.wrapDoc(raw)) : null;
              resolve(wrapped);
            });
            return;
          }
          const wrapped = raw ? (queryObj._lean ? raw : this.wrapDoc(raw)) : null;
          resolve(wrapped);
        } catch (err) {
          if (reject) reject(err);
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
    const item = this.items.find((i) => this.matchFilter(i, filter));
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
    this.saveToFile();
    upsertRemoteDoc(this.collectionName, item._id, item).catch(() => {});
    return { modifiedCount: 1 };
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>): Promise<{ modifiedCount: number }> {
    this.load();
    let count = 0;
    for (const item of this.items) {
      if (this.matchFilter(item, filter)) {
        if (update.$set) {
          Object.assign(item, update.$set);
        } else {
          Object.assign(item, update);
        }
        (item as any).updatedAt = new Date();
        count++;
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
    options?: Record<string, any>
  ): Promise<any> {
    this.load();
    const item = this.items.find((i) => this.matchFilter(i, filter));
    if (!item) return null;

    if (update.$set) {
      Object.assign(item, update.$set);
    } else {
      Object.assign(item, update);
    }
    (item as any).updatedAt = new Date();
    this.saveToFile();
    return this.wrapDoc(item);
  }

  async deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }> {
    this.load();
    const idx = this.items.findIndex((i) => this.matchFilter(i, filter));
    if (idx !== -1) {
      this.items.splice(idx, 1);
      this.saveToFile();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: Record<string, any> = {}): Promise<{ deletedCount: number }> {
    this.load();
    const initialLen = this.items.length;
    this.items = this.items.filter((i) => !this.matchFilter(i, filter));
    const deletedCount = initialLen - this.items.length;
    if (deletedCount > 0) {
      this.saveToFile();
    }
    return { deletedCount };
  }

  async findByIdAndDelete(id: any): Promise<any> {
    this.load();
    const idStr = String(id?._id || id);
    const idx = this.items.findIndex((i) => String(i._id) === idStr);
    if (idx !== -1) {
      const removed = this.items.splice(idx, 1)[0];
      this.saveToFile();
      return this.wrapDoc(removed);
    }
    return null;
  }
}
