import { Kysely, sql } from 'kysely'
import { rawDB } from '../index.js'

export async function up(db: Kysely<any>): Promise<void> {
  const expression = `
create table Autor
(
    id     INTEGER not null
        primary key autoincrement,
    nombre TEXT    not null
);

create index Autor_nombre_idx
    on Autor (nombre);

create unique index Autor_nombre_key
    on Autor (nombre);

create table Comision
(
    id     INTEGER not null
        primary key autoincrement,
    nombre TEXT    not null
);

create index Comision_nombre_idx
    on Comision (nombre);

create unique index Comision_nombre_key
    on Comision (nombre);

create table Cuatrenio
(
    id     INTEGER not null
        primary key autoincrement,
    inicio INTEGER not null,
    fin    INTEGER not null,
    title  TEXT    not null
);

create index Cuatrenio_inicio_fin_idx
    on Cuatrenio (inicio, fin);

create unique index Cuatrenio_inicio_fin_key
    on Cuatrenio (inicio, fin);

create index Cuatrenio_title_idx
    on Cuatrenio (title);

create unique index Cuatrenio_title_key
    on Cuatrenio (title);

create table Legislatura
(
    id          INTEGER not null
        primary key autoincrement,
    inicio      INTEGER not null,
    fin         INTEGER not null,
    title       TEXT    not null,
    camaraId    INTEGER not null,
    cuatrenioId INTEGER not null
        constraint Legislatura_cuatrenioId_fkey
            references Cuatrenio
            on update cascade on delete restrict
);

create index Legislatura_inicio_fin_idx
    on Legislatura (inicio, fin);

create unique index Legislatura_inicio_fin_key
    on Legislatura (inicio, fin);

create index Legislatura_title_idx
    on Legislatura (title);

create unique index Legislatura_title_key
    on Legislatura (title);

create table Ponente
(
    id     INTEGER not null
        primary key autoincrement,
    nombre TEXT    not null
);

create index Ponente_nombre_idx
    on Ponente (nombre);

create unique index Ponente_nombre_key
    on Ponente (nombre);

create table ProyectoSenado
(
    id              INTEGER  not null
        primary key autoincrement,
    numero          TEXT     not null,
    numeroCamara    TEXT,
    titulo          TEXT     not null,
    comisionId      INTEGER  not null
        constraint ProyectoSenado_comisionId_fkey
            references Comision
            on update cascade on delete restrict,
    estado          TEXT,
    estadoAnotacion TEXT,
    fechaRadicado   DATETIME not null,
    legislaturaId   INTEGER  not null
        constraint ProyectoSenado_legislaturaId_fkey
            references Legislatura
            on update cascade on delete restrict,
    url             TEXT     not null
);

create table AutorProyectos
(
    id         INTEGER not null
        primary key autoincrement,
    autorId    INTEGER not null
        constraint AutorProyectos_autorId_fkey
            references Autor
            on update cascade on delete restrict,
    proyectoId INTEGER not null
        constraint AutorProyectos_proyectoId_fkey
            references ProyectoSenado
            on update cascade on delete restrict
);

create unique index AutorProyectos_autorId_proyectoId_key
    on AutorProyectos (autorId, proyectoId);

create table PonenteProyecto
(
    id         INTEGER not null
        primary key autoincrement,
    ponenteId  INTEGER not null
        constraint PonenteProyecto_ponenteId_fkey
            references Ponente
            on update cascade on delete restrict,
    proyectoId INTEGER not null
        constraint PonenteProyecto_proyectoId_fkey
            references ProyectoSenado
            on update cascade on delete restrict
);

create unique index PonenteProyecto_ponenteId_proyectoId_key
    on PonenteProyecto (ponenteId, proyectoId);

create index ProyectoSenado_comisionId_idx
    on ProyectoSenado (comisionId);

create index ProyectoSenado_estado_idx
    on ProyectoSenado (estado);

create index ProyectoSenado_numero_idx
    on ProyectoSenado (numero);

create unique index ProyectoSenado_numero_key
    on ProyectoSenado (numero);

create table ProyectoSenadoDetalles
(
    id                           INTEGER not null
        primary key autoincrement,
    proyectoId                   INTEGER not null
        constraint ProyectoSenadoDetalles_proyectoId_fkey
            references ProyectoSenado
            on update cascade on delete restrict,
    origen                       TEXT,
    tipoLey                      TEXT,
    fechaEnvioComision           DATETIME,
    fechaPresentacion            DATETIME,
    fechaAprobacionPrimerDebate  DATETIME,
    fechaAprobacionSegundoDebate DATETIME,
    fechaConciliacion            DATETIME
);

create unique index ProyectoSenadoDetalles_proyectoId_key
    on ProyectoSenadoDetalles (proyectoId);

create table ProyectoSenadoPublicaciones
(
    id                INTEGER not null
        primary key autoincrement,
    proyectoId        INTEGER not null
        constraint ProyectoSenadoPublicaciones_proyectoId_fkey
            references ProyectoSenado
            on update cascade on delete restrict,
    exposicionMotivos TEXT,
    primeraPonencia   TEXT,
    segundaPonencia   TEXT,
    textoPlenaria     TEXT,
    conciliacion      TEXT,
    objeciones        TEXT,
    concepto          TEXT,
    textoRehecho      TEXT,
    sentenciaCorte    TEXT
);

create unique index ProyectoSenadoPublicaciones_proyectoId_key
    on ProyectoSenadoPublicaciones (proyectoId);

create table ProyectosRelacionados
(
    id                INTEGER not null
        primary key autoincrement,
    proyectoId        INTEGER not null
        constraint ProyectosRelacionados_proyectoId_fkey
            references ProyectoSenado
            on update cascade on delete restrict,
    relacionadoNumero TEXT    not null
);

create unique index ProyectosRelacionados_proyectoId_relacionadoNumero_key
    on ProyectosRelacionados (proyectoId, relacionadoNumero);
  `

  rawDB.exec(expression)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback migration here.
}
