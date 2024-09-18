import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  db.schema
    .createTable('CamaraProyectos')
    .addColumn('numeroCamara', 'text', (col) => col.primaryKey().notNull())
    .addColumn('numeroSenado', 'text')
    .addColumn('tituloCorto', 'text')
    .addColumn('tipo', 'text')
    .addColumn('autores', 'text')
    .addColumn('estado', 'text')
    .addColumn('comision', 'text')
    .addColumn('origen', 'text')
    .addColumn('legislatura', 'text')
    .addColumn('url', 'text')
    .addColumn('tituloLargo', 'text')
    .addColumn('objeto', 'text')
    .addColumn('contenido', 'text')
    .addColumn('observaciones', 'text')
    .addColumn('listDataHash', 'text')
    .addColumn('detailDataHash', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
  db.schema.dropTable('CamaraProyectos').execute()
}
