import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Database location.
 *
 * Can be overridden with:
 * DATABASE_PATH=./data/quill.db
 *
 * Defaults to:
 * ./data/quill.db
 */
const databasePath = resolve(
    process.env.DATABASE_PATH ?? "./data/quill.db",
);

mkdirSync(dirname(databasePath), { recursive: true });

/**
 * Open the SQLite database.
 */
export const db = new DatabaseSync(databasePath);

/**
 * Enable foreign-key constraints.
 */
db.exec("PRAGMA foreign_keys = ON;");

/**
 * Run the initial database migration.
 */
function runMigrations(): void {
    const migrationPath = resolve(
        __dirname,
        "migrations",
        "001_initial_schema.sql",
    );

    if (!existsSync(migrationPath)) {
        throw new Error(
            `Database migration not found: ${migrationPath}`,
        );
    }

    const migration = readFileSync(migrationPath, "utf8");

    db.exec(migration);

    console.log(
        `Database migration applied successfully: ${migrationPath}`,
    );
}

/**
 * Initialize the database.
 *
 * This function is safe to call multiple times because the
 * migration uses CREATE TABLE IF NOT EXISTS.
 */
export function initializeDatabase(): void {
    runMigrations();
}

/**
 * Initialize the database when this module is executed/imported.
 */
initializeDatabase();

console.log(`SQLite database: ${databasePath}`);
