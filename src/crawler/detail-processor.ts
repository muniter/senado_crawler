import { load, CheerioAPI } from 'cheerio'
import { writeFileSync } from 'fs'
import {
  NumeroIdentificador,
  parseNumeroIdentificador,
  parseTextualDate,
  processListOfPersonas
} from './list-processor'

export type ProyectoDetailData = {
  numero: NumeroIdentificador
  numeroCamara?: NumeroIdentificador
  comision: string
  origen: string
  tipoLey: string
  ponentes: {
    debate: 'primer' | 'segundo'
    ponente: string
  }[]
  conciliadores: string[]
  fechaEnvioComision?: Date
  fechaPresentacion?: Date
  fechaAprobacionPrimerDebate?: Date
  fechaAprobacionSegundoDebate?: Date
  fechaConciliacion?: Date
  publicaciones: {
    exposicionMotivos?: string
    primeraPonencia?: string
    segundaPonencia?: string
    textoPlenaria?: string
    conciliacion?: string
    objeciones?: string
    concepto?: string
    textoRehecho?: string
    sentenciaCorte?: string
  }
}

export function processSenadoDetail(raw: string): ProyectoDetailData {
  const $ = load(raw)
  const { numeroSenado: numero, numeroCamara } = getNumerosSenadoYCamara($)
  return {
    numero,
    numeroCamara,
    comision: getComision($),
    origen: getOrigen($),
    tipoLey: getTipoDeLey($),
    ponentes: [...getPonentesPrimerDebate($), ...getPonentesSegundoDebate($)],
    conciliadores: getConciliadoresSenado($),
    fechaEnvioComision: getFechaEnvioComision($),
    fechaPresentacion: getFechaPresentacion($),
    fechaAprobacionPrimerDebate: fechaAprobacionPrimerDebate($),
    fechaAprobacionSegundoDebate: fechaAprobacionSegundoDebate($),
    fechaConciliacion: fechaConciliacion($),
    publicaciones: parseSenadoPublicacionesTable($)
  }
}

function getOrigen($: CheerioAPI): string {
  // TODO; Se puede dejar el origen solo en dos, cuales son los valores posibles?
  const raw = $("td:contains('Origen:')").next('td').text().trim()
  return raw
}

function getTipoDeLey($: CheerioAPI): string {
  const raw = $("td:contains('Tipo de Ley:')").next('td').text().trim()
  return raw
}

function getPonentesPrimerDebate($: CheerioAPI): { debate: 'primer'; ponente: string }[] {
  const raw = $("td:contains('Ponente Primer Debate:')").next('td').text().trim()
  return processListOfPersonas(raw).map((p) => ({ debate: 'primer', ponente: p }))
}

function getPonentesSegundoDebate($: CheerioAPI): { debate: 'segundo'; ponente: string }[] {
  const raw = $("td:contains('Ponente Segundo Debate:')").next('td').text().trim()
  return processListOfPersonas(raw).map((p) => ({ debate: 'segundo', ponente: p }))
}

function getConciliadoresSenado($: CheerioAPI) {
  const raw = $("td:contains('Conciliador senado:')").next('td').text().trim()
  return processListOfPersonas(raw)
}

function getNumerosSenadoYCamara($: CheerioAPI): {
  numeroSenado: NumeroIdentificador
  numeroCamara?: NumeroIdentificador
} {
  // Se encuentra Senado: numero <br> Camara: numero
  const raw = $("dd > div").find("p:contains('Senado:')").text().trim()
  const [senado, camara] = raw.split('Camara:')

  if (!senado) {
    // console.error(`No se encontro el numero de senado, contenido: ${$('dd').text()}`)
    throw new Error(`No se encontro el numero de senado, contenido: ${$('dd').text()}`)
  }

  const numeroSenado = parseNumeroIdentificador(senado)
  let numeroCamara: NumeroIdentificador | undefined = undefined
  if (camara) {
    try {
      numeroCamara = parseNumeroIdentificador(camara)
    } catch (e) {
      numeroCamara = undefined
    }
  }
  // return raw;
  return { numeroSenado, numeroCamara }
}

function fechaDeCampo($: CheerioAPI, campo: string): Date | undefined {
  const raw = $(`td:contains('${campo}')`).first().next('td').text().trim()
  try {
    return parseTextualDate(raw)
  } catch (e) {
    return undefined
  }
}

function getFechaPresentacion($: CheerioAPI) {
  return fechaDeCampo($, 'Fecha de Presentación:')
}
function getFechaEnvioComision($: CheerioAPI): Date | undefined {
  return fechaDeCampo($, 'Fecha de Envio a Comisión:')
}

function fechaAprobacionPrimerDebate($: CheerioAPI) {
  return fechaDeCampo($, 'Fecha de Aprobación Primer Debate:')
}

function fechaAprobacionSegundoDebate($: CheerioAPI) {
  return fechaDeCampo($, 'Fecha de Aprobación Segundo Debate:')
}

function fechaConciliacion($: CheerioAPI) {
  return fechaDeCampo($, 'Fecha de Conciliación:')
}

function getComision($: CheerioAPI): string {
  const raw = $("td:contains('Repartido a Comisión:')").first().next('td').text().trim()
  if (raw == '-') {
    return 'NO ASIGNADA'
  }
  return raw
}

function parseSenadoPublicacionesTable($: CheerioAPI): ProyectoDetailData['publicaciones'] {
  const table = $("strong:contains('Publicaciones Senado:')").next('table')
  if (table.length == 0) {
    throw new Error('No se encontro la tabla de publicaciones')
  }
  // First row is titles
  const secondRow = table.find('tr').eq(1)
  const [exposicionMotivos, primeraPonencia, segundaPonencia] = secondRow
    .find('td')
    .toArray()
    .map((td) => $(td).find('a').first().attr('href'))
    .map((href) => (href?.startsWith('http') ? href : undefined))

  const fourthRow = table.find('tr').eq(4)
  const [textoPlenaria, conciliacion, objeciones] = fourthRow
    .find('td')
    .toArray()
    .map((td) => $(td).find('a').first().attr('href'))
    .map((href) => (href?.startsWith('http') ? href : undefined))

  const sixthRow = table.find('tr').eq(6)
  const [concepto, textoRehecho, sentenciaCorte] = sixthRow
    .find('td')
    .toArray()
    .map((td) => $(td).find('a').first().attr('href'))
    .map((href) => (href?.startsWith('http') ? href : undefined))

  return {
    exposicionMotivos,
    primeraPonencia,
    segundaPonencia,
    textoPlenaria,
    conciliacion,
    objeciones,
    concepto,
    textoRehecho,
    sentenciaCorte
  }
}
