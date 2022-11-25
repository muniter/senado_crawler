import type { Generated, GeneratedAlways, ColumnType } from 'kysely'

export interface DatabaseSchema {
  autor: Autor
  autorProyectos: AutorProyectos
  comision: Comision
  cuatrenio: Cuatrenio
  legislatura: Legislatura
  ponente: Ponente
  ponenteDebate: PonenteDebate
  proyectoSenado: ProyectoSenado
  proyectoSenadoDetalles: ProyectoSenadoDetalles
  proyectoSenadoPublicaciones: ProyectoSenadoPublicaciones
  proyectosRelacionados: ProyectosRelacionados
}

export interface Autor {
  id: Generated<number>
  nombre: string
}

export interface AutorProyectos {
  id: Generated<number>
  autorId: number
  proyectoId: number
}

export interface Comision {
  id: Generated<number>
  nombre: string
}

export interface Cuatrenio {
  id: Generated<number>
  fin: number
  inicio: number
  title: GeneratedAlways<string>
}

export interface Legislatura {
  id: Generated<number>
  cuatrenioId: number
  fin: number
  inicio: number
  title: GeneratedAlways<string>
}

export interface PonenteDebate {
  id: Generated<number>
  ponenteId: number
  proyectoId: number
  debate: 'primer' | 'segundo'
}

export interface Ponente {
  id: Generated<number>
  nombre: string
}

export interface ProyectoSenado {
  id: Generated<number>
  numero: string
  numeroCamara: string | null
  titulo: string
  comisionId: number
  estado: string | null
  estadoAnotacion: string | null
  fechaRadicado: Generated<string | string | string> // TODO: convert to Date
  legislaturaId: number
  url: string
  // TODO:
  // lastCrawled: ColumnType<string | string | string >; // TODO: convert to Date
  // lastUpdated: ColumnType<string | string | string >; // TODO: convert to Date
}

export interface ProyectoSenadoDetalles {
  id: Generated<number>
  proyectoId: number
  origen: string | null
  tipoLey: string | null
  fechaEnvioComision: ColumnType<string | string | string> | null // TODO: convert to Date
  fechaPresentacion: ColumnType<string | string | string> | null // TODO: convert to Date
  fechaAprobacionPrimerDebate: ColumnType<string | string | string> | null // TODO: convert to Date
  fechaAprobacionSegundoDebate: ColumnType<string | string | string> | null // TODO: convert to Date
  fechaConciliacion: ColumnType<string | string | string> | null // TODO: convert to Date
}

export interface ProyectoSenadoPublicaciones {
  id: Generated<number>
  proyectoId: number
  exposicionMotivos: string | null
  primeraPonencia: string | null
  segundaPonencia: string | null
  textoPlenaria: string | null
  conciliacion: string | null
  objeciones: string | null
  concepto: string | null
  textoRehecho: string | null
  sentenciaCorte: string | null
}

export interface ProyectosRelacionados {
  id: Generated<number>
  proyectoId: number
  relacionadoNumero: string
}
