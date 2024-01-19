import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface Autor {
  id: Generated<number>;
  nombre: string;
}

export interface AutorProyectos {
  autorId: number;
  id: Generated<number>;
  proyectoId: number;
}

export interface Comision {
  id: Generated<number>;
  nombre: string;
}

export interface Cuatrenio {
  fin: number;
  id: Generated<number>;
  inicio: number;
  title: string;
}

export interface Legislatura {
  cuatrenioId: number;
  fin: number;
  id: Generated<number>;
  inicio: number;
  title: string;
}

export interface Ponente {
  id: Generated<number>;
  nombre: string;
}

export interface PonenteProyecto {
  id: Generated<number>;
  ponenteId: number;
  proyectoId: number;
}

export interface ProyectoSenado {
  comisionId: number;
  estado: string | null;
  estadoAnotacion: string | null;
  fechaRadicado: string;
  id: Generated<number>;
  legislaturaId: number;
  numero: string;
  numeroCamara: string | null;
  titulo: string;
  url: string;
}

export interface ProyectoSenadoDetalles {
  fechaAprobacionPrimerDebate: string | null;
  fechaAprobacionSegundoDebate: string | null;
  fechaConciliacion: string | null;
  fechaEnvioComision: string | null;
  fechaPresentacion: string | null;
  id: Generated<number>;
  origen: string | null;
  proyectoId: number;
  tipoLey: string | null;
}

export interface ProyectoSenadoPublicaciones {
  concepto: string | null;
  conciliacion: string | null;
  exposicionMotivos: string | null;
  id: Generated<number>;
  objeciones: string | null;
  primeraPonencia: string | null;
  proyectoId: number;
  segundaPonencia: string | null;
  sentenciaCorte: string | null;
  textoPlenaria: string | null;
  textoRehecho: string | null;
}

export interface ProyectosRelacionados {
  id: Generated<number>;
  proyectoId: number;
  relacionadoNumero: string;
}

export interface DB {
  Autor: Autor;
  AutorProyectos: AutorProyectos;
  Comision: Comision;
  Cuatrenio: Cuatrenio;
  Legislatura: Legislatura;
  Ponente: Ponente;
  PonenteProyecto: PonenteProyecto;
  ProyectoSenado: ProyectoSenado;
  ProyectoSenadoDetalles: ProyectoSenadoDetalles;
  ProyectoSenadoPublicaciones: ProyectoSenadoPublicaciones;
  ProyectosRelacionados: ProyectosRelacionados;
}
