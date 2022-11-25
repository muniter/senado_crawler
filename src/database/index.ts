import { Kysely, SqliteDialect, Transaction } from 'kysely'
import Database from 'better-sqlite3'
import { DatabaseSchema } from './schema'

export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({ database: new Database('./prisma/dev.db') }),
  log: process.env.DATABASE_DEBUG === 'true' ? ['query', 'error'] : ['error']
})

export type DBTransaction = Transaction<DatabaseSchema>
