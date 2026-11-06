import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class EmbeddedCollection<T extends Record<string, any>> {
  private filePath: string;
  private items: T[] = [];

  constructor(collectionName: string) {
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.items = JSON.parse(raw);
      } else {
        this.items = [];
        this.saveToFile();
      }
    } catch (err) {
      this.items = [];
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2), 'utf-8');
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

    doc.save = async () => {
      const idx = this.items.findIndex((i: any) => String(i._id) === String(doc._id));
      if (idx !== -1) {
        this.items[idx] = { ...doc };
        delete this.items[idx].save;
        delete this.items[idx].toObject;
        delete this.items[idx].id;
        this.saveToFile();
      }
      return doc;
    };

    doc.toObject = () => {
      const copy = { ...doc };
      delete copy.save;
      delete copy.toObject;
      return copy;
    };

    return doc;
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    return this.items.filter((item) => this.matchFilter(item, filter)).length;
  }

  async create(data: Partial<T>): Promise<any> {
    const item: any = {
      _id: (data as any)._id || crypto.randomBytes(12).toString('hex'),
      createdAt: (data as any).createdAt || new Date(),
      updatedAt: (data as any).updatedAt || new Date(),
      ...data,
    };
    this.items.push(item);
    this.saveToFile();
    return this.wrapDoc(item);
  }

  find(filter: Record<string, any> = {}): any {
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
          let res = [...matched];
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
    const raw = this.items.find((item) => this.matchFilter(item, filter));

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

      then: (resolve: (val: any) => void, reject?: (err: any) => void) => {
        try {
          if (!raw) {
            resolve(null);
            return;
          }
          const wrapped = queryObj._lean ? raw : this.wrapDoc(raw);
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

  async updateMany(filter: Record<string, any>, update: Record<string, any>): Promise<{ modifiedCount: number }> {
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
}
