import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initDB } from './schema';

const DB_PATH = path.join(process.cwd(), 'data', 'chat.db');

let db: Database.Database;

export function getDB() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDB(db);
  }
  return db;
}
