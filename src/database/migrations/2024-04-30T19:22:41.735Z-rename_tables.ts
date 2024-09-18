import { Kysely, sql } from 'kysely'
import { rawDB } from '../index.js'

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  rawDB.exec(`
    ALTER TABLE CamaraProyectos RENAME TO camara;
    ALTER TABLE ProyectosSenado RENAME TO senado;
    ALTER TABLE ProyectosActoLegislativoSenado RENAME TO senado_pal;
    ALTER TABLE Cuatrenio RENAME TO cuatrenio_1;
    ALTER TABLE Legislatura RENAME TO legislatura_1;
    ALTER TABLE legislatura_1 RENAME TO legislatura;
    ALTER TABLE cuatrenio_1 RENAME TO cuatrenio;
  `)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
  throw new Error('Migration cannot be rolled back')
}
