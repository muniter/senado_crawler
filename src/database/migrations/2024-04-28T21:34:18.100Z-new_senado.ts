import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  await db.schema
    .createTable('ProyectosSenadoNew')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('id_senado', 'integer', (col) => col.notNull())
    .addColumn('legislatura', 'varchar(100)', (col) => col.notNull())
    .addColumn('numero', 'varchar(10)', (col) => col.notNull())
    .addColumn('numeroCamara', 'varchar(100)')
    .addColumn('titulo', 'varchar(1000)', (col) => col.notNull())
    .addColumn('estado', 'varchar(100)', (col) => col.notNull())
    .addColumn('estadoAnotacion', 'varchar(1000)')
    .addColumn('comision', 'varchar(1000)', (col) => col.notNull())
    .addColumn('fechaDePresentacion', 'date', (col) => col.notNull())
    .addColumn('fechaRadicado', 'date', (col) => col.notNull())
    .addColumn('origen', 'varchar(100)', (col) => col.notNull())
    .addColumn('tipoLey', 'varchar(100)', (col) => col.notNull())
    .addColumn('fechaEnvioComision', 'date')
    .addColumn('fechaAprobacionPrimerDebate', 'date')
    .addColumn('fechaAprobacionSegundoDebate', 'date')
    .addColumn('fechaConciliacion', 'date')
    .addColumn('autores', 'json', (col) => col.notNull().defaultTo('[]'))
    .addColumn('exposicionMotivos', 'varchar(1000)')
    .addColumn('primeraPonencia', 'varchar(1000)')
    .addColumn('segundaPonencia', 'varchar(1000)')
    .addColumn('textoPlenaria', 'varchar(1000)')
    .addColumn('conciliacion', 'varchar(1000)')
    .addColumn('objeciones', 'varchar(1000)')
    .addColumn('concepto', 'varchar(1000)')
    .addColumn('textoRehecho', 'varchar(1000)')
    .addColumn('sentenciaCorte', 'varchar(1000)')
    .addColumn('url', 'varchar(1000)', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('ProyectosSenadoNew_unique_numero_legislatura')
    .on('ProyectosSenadoNew')
    .columns(['numero', 'legislatura'])
    .unique()
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  await db.schema.dropTable('ProyectosSenadoNew').execute()
}
