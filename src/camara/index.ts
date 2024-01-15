import { Axios } from "axios"
import { processPage } from "./crawler/list-processor"

export interface NumeroIdentificador {
  numero: number
  year: number
}

interface Estado {
  estado: string
  anotacion?: string
}

export type ProyectoBasicData = {
  comision: string
  estado: Estado
  titulo: string
  autores: string[]
  numeroSenado: NumeroIdentificador
  proyectosAcumulados: NumeroIdentificador[]
  numeroCamara?: NumeroIdentificador
  fechaRadicado: Date
  url: string
}

// Example URL
// https://www.camara.gov.co/secretaria/proyectos-de-ley?p=secretaria/proyectos-de-ley&field_periodo_legislativo_target_id=All&field_estadoley_target_id=All&field_fastrack_value=All&field_tipo_taxonomia_target_id=All&field_origen_target_id=All&field_comision_proyecto_de_ley_target_id=All&limit=100&combine=&page=10

export const config = {
  url: {
    base: 'https://www.camara.gov.co',
    head: '/secretaria/proyectos-de-ley',
    query: '?p=secretaria/proyectos-de-ley&field_periodo_legislativo_target_id=All&field_estadoley_target_id=All&field_fastrack_value=All&field_tipo_taxonomia_target_id=All&field_origen_target_id=All&field_comision_proyecto_de_ley_target_id=All&limit=100&combine=&page={$page}'
  }
} as const

const Camara = new Axios({
  baseURL: config.url.base
})

function getPageUrl(page: number) {
  return config.url.head + config.url.query.replace('{$page}', page.toString())
}

async function getPageData(url: string) {
  console.info('Getting page data for url', url)
  const result = await Camara.get(url, {
    timeout: 10000
  })

  return result.data
}

async function getProyectos() {
  const url = getPageUrl(0)
  const raw = await getPageData(url)
  const data = processPage(raw)
  console.log(data)
  return data
}

getProyectos()
