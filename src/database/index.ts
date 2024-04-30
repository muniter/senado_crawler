import { Kysely, ParseJSONResultsPlugin, SqliteDialect, Transaction } from 'kysely'
import Database from 'better-sqlite3'
import { type DB as DatabaseSchema } from './schema.js'

export const rawDB = new Database('./db/database.db')

export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({ database: rawDB }),
  log: process.env.DATABASE_DEBUG === 'true' ? ['query', 'error'] : ['error'],
  plugins: [new ParseJSONResultsPlugin()],
})

export type DBTransaction = Transaction<DatabaseSchema>
