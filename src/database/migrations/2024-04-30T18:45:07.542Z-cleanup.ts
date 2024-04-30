import { Kysely, sql } from 'kysely'
import { rawDB } from '../index.js';

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  const statements = `
      PRAGMA foreign_keys=off;
    DROP TABLE Autor;
    DROP TABLE AutorProyectos;
    DROP TABLE Comision;
    DROP TABLE Ponente;
    DROP TABLE PonenteProyecto;
    DROP TABLE ProyectoSenado;
    DROP TABLE ProyectoSenadoDetalles;
    DROP TABLE ProyectoSenadoPublicaciones;
    DROP TABLE ProyectosRelacionados;
    ALTER TABLE ProyectosSenadoNew RENAME TO ProyectosSenado;
    PRAGMA FOREIGN_KEYS=1
  `;

  rawDB.exec(statements);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
  throw new Error('Migration cannot be rolled back');
}
