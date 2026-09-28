import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'

// Lives outside /var/www/fairchiwazi-server, which deploys wipe with rsync --delete
export const DATA_DIR = process.env.DATA_DIR || '/var/lib/fairchiwazi'
export const RECEIPTS_DIR = path.join(DATA_DIR, 'receipts')

let db: DatabaseSync | null = null

// node:sqlite needs Node >= 22.13. If it's missing, the app keeps working and
// just skips recording, so an old Node on the VPS can't take down receipt scanning.
export async function initDb() {
  try {
    fs.mkdirSync(RECEIPTS_DIR, { recursive: true })
    const { DatabaseSync } = await import('node:sqlite')
    db = new DatabaseSync(path.join(DATA_DIR, 'fairchiwazi.db'))
    db.exec(`
      CREATE TABLE IF NOT EXISTS person_added (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        client_id TEXT,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        client_id TEXT,
        filename TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        items TEXT
      );
      CREATE TABLE IF NOT EXISTS spins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        client_id TEXT,
        people TEXT NOT NULL,
        items TEXT NOT NULL,
        winner_id TEXT NOT NULL,
        winner_name TEXT NOT NULL,
        total REAL
      );
    `)
    // Databases created before `total` existed: add it and backfill from items
    const spinColumns = db.prepare('PRAGMA table_info(spins)').all() as { name: string }[]
    if (!spinColumns.some(c => c.name === 'total')) {
      db.exec(`
        ALTER TABLE spins ADD COLUMN total REAL;
        UPDATE spins SET total = (
          SELECT ROUND(SUM(json_extract(value, '$.cost')), 2) FROM json_each(spins.items)
        );
      `)
    }
    console.log(`Database ready at ${DATA_DIR}`)
  } catch (err) {
    db = null
    console.error('Database unavailable, recording disabled:', err)
  }
}

export function recordPersonAdded(clientId: string | null, name: string) {
  db?.prepare('INSERT INTO person_added (client_id, name) VALUES (?, ?)').run(clientId, name)
}

export function recordReceipt(r: {
  id: string
  clientId: string | null
  filename: string
  mimeType: string
  sizeBytes: number
  items: unknown
}) {
  db?.prepare(
    'INSERT INTO receipts (id, client_id, filename, mime_type, size_bytes, items) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(r.id, r.clientId, r.filename, r.mimeType, r.sizeBytes, JSON.stringify(r.items))
}

export function recordSpin(s: {
  clientId: string | null
  people: unknown
  items: unknown
  winnerId: string
  winnerName: string
  total: number
}) {
  db?.prepare(
    'INSERT INTO spins (client_id, people, items, winner_id, winner_name, total) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(s.clientId, JSON.stringify(s.people), JSON.stringify(s.items), s.winnerId, s.winnerName, s.total)
}
