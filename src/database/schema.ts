import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface CamaraProyectos {
  autores: string | null;
  comision: string | null;
  contenido: string | null;
  detailDataHash: string | null;
  estado: string | null;
  legislatura: string | null;
  listDataHash: string | null;
  numeroCamara: string;
  numeroSenado: string | null;
  objeto: string | null;
  observaciones: string | null;
  origen: string | null;
  tipo: string | null;
  tituloCorto: string | null;
  tituloLargo: string | null;
  url: string | null;
}

export interface Cuatrenio {
  fin: number;
  id: Generated<number>;
  inicio: number;
  title: string;
}

export interface Legislatura {
  camaraId: number;
  cuatrenioId: number;
  fin: number;
  id: Generated<number>;
  inicio: number;
  title: string;
}

export interface ProyectosActoLegislativoSenado {
  acumulados: string | null;
  autores: string | null;
  created_at: Generated<string | null>;
  estado: string | null;
  estadoAnotacion: string | null;
  fechaDePresentacion: string | null;
  id: Generated<number | null>;
  id_senado: number;
  legislatura: string;
  numero: string;
  numeroCamara: string | null;
  origen: string | null;
  ponentesPrimerDebate: string | null;
  titulo: string;
  updated_at: Generated<string | null>;
  url: string;
}

export interface ProyectosSenado {
  autores: Generated<string>;
  comision: string;
  concepto: string | null;
  conciliacion: string | null;
  estado: string;
  estadoAnotacion: string | null;
  exposicionMotivos: string | null;
  fechaAprobacionPrimerDebate: string | null;
  fechaAprobacionSegundoDebate: string | null;
  fechaConciliacion: string | null;
  fechaDePresentacion: string;
  fechaEnvioComision: string | null;
  fechaRadicado: string;
  id: Generated<number | null>;
  id_senado: number;
  legislatura: string;
  numero: string;
  numeroCamara: string | null;
  objeciones: string | null;
  origen: string;
  primeraPonencia: string | null;
  segundaPonencia: string | null;
  sentenciaCorte: string | null;
  textoPlenaria: string | null;
  textoRehecho: string | null;
  tipoLey: string;
  titulo: string;
  url: string;
}

export interface DB {
  CamaraProyectos: CamaraProyectos;
  Cuatrenio: Cuatrenio;
  Legislatura: Legislatura;
  ProyectosActoLegislativoSenado: ProyectosActoLegislativoSenado;
  ProyectosSenado: ProyectosSenado;
}
