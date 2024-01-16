import * as path from 'path'
import { db } from './index'
import { promises as fs } from 'fs'
import {
  Migrator,
  FileMigrationProvider,
} from 'kysely'
import { Command } from 'commander'
const program = new Command()

program.description('Database migrator script');
program.requiredOption('--action <string>', 'migrate | generate')
program.option('--name <string>', 'migration name')
program.action(main)

async function main(options: any) {
  const action = options.action
  const name = options.name

  if (action === 'migrate') {
    await migrateToLatest()
  } else if (action === 'generate') {
    await generateMigrationFile(name)
  } else {
    console.error(`unknown action: ${action}`)
    process.exit(1)
  }
  process.exit(0)
}


async function migrateToLatest() {
  console.log('migrating database to latest version')

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, '/migrations'),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`)
    }
  })

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
}`;

  let filename = new Date().toISOString()
  if (name) {
    filename = `${filename}-${name.replaceAll(' ', '_')}`
  }
  const filepath = path.join(__dirname, '/migrations', `${filename}.ts`);
  console.log(`creating migration file ${filepath}`);
  await fs.writeFile(filepath, string);
}

program.parse(process.argv)
