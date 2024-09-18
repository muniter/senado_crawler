import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  db.schema
    .createTable('ProyectosActoLegislativoSenado')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('id_senado', 'integer', (col) => col.notNull())
    .addColumn('numero', 'varchar', (col) => col.notNull().unique())
    .addColumn('estado', 'varchar')
    .addColumn('titulo', 'varchar', (col) => col.notNull())
    .addColumn('url', 'varchar', (col) => col.notNull())
    .addColumn('fechaDePresentacion', 'date')
    .addColumn('numeroCamara', 'varchar')
    .addColumn('acumulados', 'json')
    .addColumn('autores', 'json')
    .addColumn('legislatura', 'varchar', (col) => col.notNull())
    .addColumn('origen', 'varchar')
    .addColumn('ponentesPrimerDebate', 'json')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql.raw('CURRENT_TIMESTAMP')))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql.raw('CURRENT_TIMESTAMP')))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  db.schema.dropTable('ProyectosActoLegislativoSenado').execute()
}
