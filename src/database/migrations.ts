import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      root TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      language TEXT NOT NULL,
      startLine INTEGER NOT NULL,
      endLine INTEGER NOT NULL,
      hash TEXT NOT NULL,
      content TEXT NOT NULL,
      embeddingModel TEXT,
      embeddingDimensions INTEGER,
      embedding BLOB,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);
    CREATE INDEX IF NOT EXISTS idx_chunks_project ON chunks(projectId);
    CREATE INDEX IF NOT EXISTS idx_chunks_hash ON chunks(hash);

    CREATE TABLE IF NOT EXISTS cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
      content,
      path,
      kind UNINDEXED,
      language UNINDEXED,
      content='chunks',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
      INSERT INTO chunks_fts(rowid, content, path, kind, language)
      VALUES (new.id, new.content, new.path, new.kind, new.language);
    END;

    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content, path, kind, language)
      VALUES ('delete', old.id, old.content, old.path, old.kind, old.language);
    END;

    CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content, path, kind, language)
      VALUES ('delete', old.id, old.content, old.path, old.kind, old.language);
      INSERT INTO chunks_fts(rowid, content, path, kind, language)
      VALUES (new.id, new.content, new.path, new.kind, new.language);
    END;
  `);
}
