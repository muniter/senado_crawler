import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  await db.schema
    .alterTable('ProyectosActoLegislativoSenado')
    .addColumn('estadoAnotacion', 'varchar(1000)')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
  await db.schema
    .alterTable('ProyectosActoLegislativoSenado')
    .dropColumn('estadoAnotacion')
    .execute()
}
