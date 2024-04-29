import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here.
  await sql`
    create table main.ProyectosActoLegislativoSenadoNew
  (
      id                   integer
          primary key autoincrement,
      id_senado            integer not null,
      numero               varchar not null,
      estado               varchar,
      titulo               varchar not null,
      url                  varchar not null,
      fechaDePresentacion  date,
      numeroCamara         varchar,
      acumulados           json,
      autores              json,
      legislatura          varchar not null,
      origen               varchar,
      ponentesPrimerDebate json,
      created_at           timestamp default CURRENT_TIMESTAMP,
      updated_at           timestamp default CURRENT_TIMESTAMP
  );
  `.execute(db)
  await sql`
  create unique index main.ProyectosActoLegislativoSenadoNew_unique_numero_legislatura
      on ProyectosActoLegislativoSenadoNew (numero, legislatura);
  `.execute(db)
  await sql`INSERT INTO ProyectosActoLegislativoSenadoNew SELECT * FROM ProyectosActoLegislativoSenado;`.execute(db)
  await sql`DROP TABLE ProyectosActoLegislativoSenado;`.execute(db)
  await sql`ALTER TABLE ProyectosActoLegislativoSenadoNew RENAME TO ProyectosActoLegislativoSenado;`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
}
