'use server';

import fs from 'fs/promises';
import path from 'path';

// This is a simple file-based key-value store for demonstration.
// For production, use a real database like PostgreSQL or Firestore.
const DB_PATH = path.join(process.cwd(), 'db.json');

async function readDb(): Promise<Record<string, any>> {
  try {
    await fs.access(DB_PATH);
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty object
    if (isNodeError(error) && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeDb(data: Record<string, any>): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error;
}

export interface DbService {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

class FileDbService implements DbService {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const db = await readDb();
    return (db[key] as T) ?? defaultValue;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await readDb();
    db[key] = value;
    await writeDb(db);
  }

  async delete(key: string): Promise<void> {
    const db = await readDb();
    delete db[key];
    await writeDb(db);
  }
}

let dbInstance: DbService;

export function createDbService(): DbService {
  if (!dbInstance) {
    dbInstance = new FileDbService();
  }
  return dbInstance;
}
