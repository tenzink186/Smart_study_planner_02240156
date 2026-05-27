// models/db.js
// Initialises the SQLite database using sql.js (pure-JavaScript SQLite).
// Provides a synchronous-style wrapper (prepare/exec) for use in controllers.

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.resolve(process.env.DB_PATH || './database.sqlite');

// The raw sql.js Database instance — set once during initDb()
let _db = null;

// ── Persistence ───────────────────────────────────────────────────────────────

/** Saves the current in-memory database to the .sqlite file on disk */
function persist() {
    fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

/**
 * Prepares a parameterised SQL statement.
 * Returns an object with .run(), .get(), and .all() matching the better-sqlite3 API.
 */
function prepare(sql) {
    return {
        /**
         * Executes a write statement (INSERT / UPDATE / DELETE).
         * Returns { lastInsertRowid, changes }.
         */
        run(...params) {
            _db.run(sql, params);

            // Query row-id and change count before persisting
            const idStmt = _db.prepare('SELECT last_insert_rowid() AS id');
            idStmt.step();
            const { id } = idStmt.getAsObject();
            idStmt.free();

            const chStmt = _db.prepare('SELECT changes() AS ch');
            chStmt.step();
            const { ch } = chStmt.getAsObject();
            chStmt.free();

            persist();
            return { lastInsertRowid: id, changes: ch };
        },

        /** Executes a SELECT and returns the first row as a plain object, or undefined */
        get(...params) {
            const stmt = _db.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return row;
            }
            stmt.free();
            return undefined;
        },

        /** Executes a SELECT and returns all rows as an array of plain objects */
        all(...params) {
            const stmt    = _db.prepare(sql);
            stmt.bind(params);
            const rows    = [];
            while (stmt.step()) { rows.push(stmt.getAsObject()); }
            stmt.free();
            return rows;
        },
    };
}

/** Runs one or more schema statements that need no parameters (CREATE TABLE, PRAGMA, etc.) */
function exec(sql) {
    _db.run(sql);
    persist();
}

// ── Schema ────────────────────────────────────────────────────────────────────

function createSchema() {
    // sessions — one row per study session
    _db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            subject       TEXT    NOT NULL,
            difficulty    INTEGER NOT NULL,
            energy        INTEGER NOT NULL,
            duration      INTEGER NOT NULL,
            focus_score   REAL    NOT NULL,
            notes         TEXT    DEFAULT '',
            completed     INTEGER DEFAULT 0,
            completed_at  INTEGER,
            effectiveness INTEGER,
            created_at    INTEGER DEFAULT (strftime('%s','now') * 1000)
        )
    `);

    // review_questions — each question belongs to one session
    _db.run(`
        CREATE TABLE IF NOT EXISTS review_questions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  INTEGER NOT NULL,
            question    TEXT    NOT NULL,
            created_at  INTEGER DEFAULT (strftime('%s','now') * 1000),
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    `);

    persist();
}

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Initialises sql.js and the database schema.
 * Must be awaited once before the server starts accepting requests.
 *
 * @returns {Promise<{ prepare, exec }>}
 */
async function initDb() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        _db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
        _db = new SQL.Database();
    }

    _db.run('PRAGMA foreign_keys = ON');
    createSchema();

    console.log(`✅  Database ready → ${DB_PATH}`);
    return { prepare, exec };
}

module.exports = { initDb };
