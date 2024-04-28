import { load, Cheerio, CheerioAPI, Element } from 'cheerio'
import { Config } from './senado'
import { getNumeroSenado, parseNumeroIdentificador, parseTextualDate, parseListOfNames } from '../../common/utils';

type CElement = Cheerio<Element>
type Comision = string
interface Estado {
  estado: string
  anotacion?: string
}

export interface NumeroIdentificador {
  numero: number
  year: number
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

function getFechaRadicado($: CheerioAPI, cell: CElement): Date {
  // First bold iside the first div
  const textDate = $(cell).find('div > b').eq(0).text().trim()
  return parseTextualDate(textDate)
}

function getNumeroCamara($: CheerioAPI, cell: CElement): NumeroIdentificador | undefined {
  // It's found in this format Cámara: {numero} |
  const raw = $(cell).find('div > b').eq(2).text().trim().toLowerCase()
  try {
    return parseNumeroIdentificador(raw)
  } catch {
    return undefined
  }
}

function getAutores($: CheerioAPI, cell: CElement): string[] {
  // It's found in this format Autores: {autores} |
  const raw = $(cell).find('p > b').first().text().trim()
  return parseListOfNames(raw)
}

function getTitulo($: CheerioAPI, cell: CElement): string {
  const text = $(cell).find('h3 > a').first().text().trim()
  // Remove trailing and leading spaces and quotes
  return text
    .replace('\n', '')
    .replace(/\.$/, '')
    .trimEnd()
    .replace(/^['"”“]/, '')
    .replace(/['"”“]$/, '')
    .replace(/\s\s+/, ' ')
}

const getUrl = ($: CheerioAPI, cell: CElement): string => {
  // h3 that has an a with an href
  const url = $(cell).find('h3 > a').attr('href')
  if (!url) {
    throw new Error('No se encontró la url del proyecto')
  }
  return Config.URLS.baseURL + url
}

function processComisionCell($: CheerioAPI, table: CElement): Comision {
  const comision = $(table).find('td').eq(0).text().trim()
  if (comision == '-') {
    return 'NO ASIGNADA'
  }
  return comision
}

function processEstadoCell($: CheerioAPI, table: CElement): Estado {
  const cell = $(table).find('td').eq(1)
  // Get only the text of the partent (the state is there), the annotation is
  // in a <p></p> tag inside the cell
  const estado = cell.clone().children().remove().end().text().replace('\n', '').trim()
  const anotacion = cell.find('p').text().replace('\n', '').trim()
  return { estado, anotacion }
}

function proccessTitleCell($: CheerioAPI, table: CElement) {
  const cell = $(table).find('td').eq(2)
  const titulo = getTitulo($, cell)
  const url = getUrl($, cell)
  const fechaRadicado = getFechaRadicado($, cell)
  const datosNumeroSenado = getNumeroSenado($(cell).find('div > b').eq(1).text())
  const numeroCamara = getNumeroCamara($, cell)
  const autores = getAutores($, cell)
  return {
    titulo,
    url,
    autores,
    numeroSenado: datosNumeroSenado.numero,
    proyectosAcumulados: datosNumeroSenado.acumulados,
    numeroCamara,
    fechaRadicado
  }
}

export function processRow($: CheerioAPI, table: CElement): ProyectoBasicData {
  const comision = processComisionCell($, table)
  const estado = processEstadoCell($, table)
  const titleExtractedData = proccessTitleCell($, table)
  return {
    comision,
    estado,
    ...titleExtractedData
  }
}

export function processSenadoList(raw: string): ProyectoBasicData[] {
  console.log('Processing senado legislatura list')
  const $ = load(raw)
  const result: ProyectoBasicData[] = []
  const tables = $('table')
  for (let i = 0; i < tables.length; i++) {
    const el = tables.eq(i)
    if (!isValidRow($, el)) {
      continue
    }
    try {
      result.push(processRow($, el))
    } catch (e: any) {
      console.error(`Error al procesar la fila ${i}: ${e.message}`)
      console.debug(`Failed processing row data: ${el.html()}`)
    }
  }
  return result
}

function isValidRow($: CheerioAPI, table: CElement) {
  // TODO: This heuristic could be improved
  return $(table).find('td').length === 3 && $(table).find('.even, .odd').length === 1
}
