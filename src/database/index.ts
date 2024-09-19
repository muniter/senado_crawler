import pg from 'pg'
import { Kysely, PostgresDialect, ParseJSONResultsPlugin, Transaction } from 'kysely'
import { type DB as DatabaseSchema } from './schema.js'

const { Pool } = pg

const dialect = new PostgresDialect({
  pool: new Pool({
    database: 'utl',
    host: 'localhost',
    user: 'utl',
    password: 'casa86admin123pg',
    port: 15432,
    max: 10
  })
})
export type DBTransaction = Transaction<DatabaseSchema>

export const db = new Kysely<DatabaseSchema>({
  dialect,
  log: process.env.DATABASE_DEBUG === 'true' ? ['query', 'error'] : ['error'],
  plugins: [new ParseJSONResultsPlugin()]
})
