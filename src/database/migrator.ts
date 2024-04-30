import * as path from 'path'
import { db } from './index.js'
import { promises as fs } from 'fs'
import {
  Migrator,
  FileMigrationProvider,
} from 'kysely'
import { Command, Option } from 'commander'
import { spawnSync } from 'child_process'
import assert from 'assert'
import { logger } from '../utils/logger.js'
import { fileURLToPath } from 'url'
const program = new Command()

const file_dirname = path.dirname(fileURLToPath(import.meta.url))

program.description('Database migrator script');
program.requiredOption('-a --action <string>', 'migrate | generate')
program.option('--name <string>', 'migration name')
program.addOption(new Option('-md --migration-dir <string>', 'migration direction').default('up').choices(['up', 'down']))
program.action(main)

async function main(options: any) {
  const action = options.action
  const name = options.name

  if (action === 'migrate') {
    await migrate(options.migrationDir as 'up' | 'down')
  } else if (action === 'generate') {
    await generateMigrationFile(name)
  } else {
    console.error(`unknown action: ${action}`)
    process.exit(1)
  }
  process.exit(0)
}


async function migrate(arg: 'up' | 'down') {

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(file_dirname, '/migrations'),
    }),
  })

  let error: unknown| null = null

  if (arg === 'up') {
    // Check if there's migrations to be applied
    const migrations = await migrator.getMigrations()
    if (migrations.filter(it => it.executedAt === undefined).length === 0) {
      logger.info('No migrations to apply')
      return;
    }

    const { error: merror, results } = await migrator.migrateToLatest()
    error = merror

    assert(results, 'results should be defined')
    results.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`migration "${it.migrationName}" was executed successfully`)
      } else if (it.status === 'Error') {
        console.error(`failed to execute migration "${it.migrationName}"`)
      }
    })
  } else {
    console.log('Migrating one step down')
    const { error: merror, results } = await migrator.migrateDown()
    error = merror

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`migration "${it.migrationName}" was rolled back successfully`)
      } else if (it.status === 'Error') {
        console.error(`failed to roll back migration "${it.migrationName}"`)
      }
    })
  }

  if (error) {
    console.error('failed to migrate')
    console.error(error)
    process.exit(1)
  }

  await db.destroy()
}

async function generateMigrationFile(name?: string) {
  const string = `import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
  throw new Error('Migration cannot be rolled back');
}`;

  let filename = new Date().toISOString()
  if (name) {
    filename = `${filename}-${name.replaceAll(' ', '_')}`
  }
  const filepath = path.join(file_dirname, '/migrations', `${filename}.ts`);
  console.log(`creating migration file ${filepath}`);
  await fs.writeFile(filepath, string);
}

program.parse(process.argv)
