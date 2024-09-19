import type { ColumnType } from 'kysely'

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>

export interface Camara {
  autores: string | null
  comision: string | null
  contenido: string | null
  detail_data_hash: string | null
  estado: string | null
  legislatura: string | null
  list_data_hash: string | null
  numero_camara: string
  numero_senado: string | null
  objeto: string | null
  observaciones: string | null
  origen: string | null
  tipo: string | null
  titulo_corto: string | null
  titulo_largo: string | null
  url: string | null
}

export interface Cuatrenio {
  fin: number
  id: Generated<number>
  inicio: number
  title: string
}

export interface Legislatura {
  camara_id: number
  cuatrenio_id: number
  fin: number
  id: Generated<number>
  inicio: number
  title: string
}

export interface Senado {
  autores: Generated<string>
  comision: string
  concepto: string | null
  conciliacion: string | null
  estado: string
  estado_anotacion: string | null
  exposicion_motivos: string | null
  fecha_aprobacion_primer_debate: string | null
  fecha_aprobacion_segundo_debate: string | null
  fecha_conciliacion: string | null
  fecha_de_presentacion: string
  fecha_envio_comision: string | null
  fecha_radicado: string
  id: Generated<number | null>
  id_senado: number
  legislatura: string
  numero: string
  numero_camara: string | null
  objeciones: string | null
  origen: string
  primera_ponencia: string | null
  segunda_ponencia: string | null
  sentencia_corte: string | null
  texto_plenaria: string | null
  texto_rehecho: string | null
  tipo_ley: string
  titulo: string
  url: string
}

export interface SenadoPal {
  acumulados: string | null
  autores: string | null
  created_at: Generated<string | null>
  estado: string | null
  estado_anotacion: string | null
  fecha_de_presentacion: string | null
  id: Generated<number | null>
  id_senado: number
  legislatura: string
  numero: string
  numero_camara: string | null
  origen: string | null
  ponentes_primer_debate: string | null
  titulo: string
  updated_at: Generated<string | null>
  url: string
}

export interface DB {
  camara: Camara
  cuatrenio: Cuatrenio
  legislatura: Legislatura
  senado: Senado
  senado_pal: SenadoPal
}
