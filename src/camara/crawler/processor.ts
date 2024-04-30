import { load } from 'cheerio';
import { buildCamaraUrl, type DetailData, type ListData } from '../index.js';
import { parseListOfNames } from '../../common/utils.js';

const numeroCamaraRegex = /\d+(\/|-)\d+C?/
const numeroSenadoRegex = /\d+(\/|-)\d+S?/
const autorRegex = /Autor.?.?:?\s/
const dateRegex = /\d{4}-\d{2}-\d{2}/

function getNumeroCamara(raw: string): string {
  const matcher = raw.match(numeroCamaraRegex)
  if (matcher) {
    let result = matcher[0].trim()
    result = result.replace('-', '/')
    if (!result.endsWith('C')) {
      result = result + 'C'
    }
    return result
  } else {
    throw new Error(`Could not find numeroCamara in: ${raw}`)
  }
}

function getNumeroSenado(raw: string): string | null {
  const matcher = raw.match(numeroSenadoRegex)
  if (matcher) {
    let result = matcher[0].trim()
    result = result.replace('-', '/')
    if (!result.endsWith('S')) {
      result = result + 'S'
    }
    return result
  } else {
    return null
  }
}

function getAutores(raw: string): string {
  let data = raw.trim().replace(autorRegex, '')
  return JSON.stringify(parseListOfNames(data))
}

function getLegislatura(raw: string): string {
  const matcher = raw.match(/\d{4}\s+-\s+\d{4}/)
  if (matcher) {
    return matcher[0].trim().replaceAll(' ', '')
  } else {
    throw new Error('Could not find legislatura in: ' + raw)
  }
}


export function processPage(raw: string): ListData[] {
  const $ = load(raw)
  const rows = $('tbody tr').toArray()
  const data = rows.map((row) => {
    const columns = $(row).find('td').toArray()
    const numeroCamara = getNumeroCamara($(columns[0]).text().trim())
    const numeroSenado = getNumeroSenado($(columns[1]).text().trim())
    const tituloCorto = $(columns[2]).text().trim()
    const url = buildCamaraUrl($(columns[2]).find('a').attr('href') ?? '')
    const tipo = $(columns[3]).text().trim()
    const autores = getAutores($(columns[4]).text().trim())
    const estado = $(columns[5]).text().trim()
    const comision = $(columns[6]).text().trim()
    const origen = $(columns[7]).text().trim()
    const legislatura = getLegislatura($(columns[8]).text())

    return {
      numeroCamara,
      numeroSenado,
      tituloCorto,
      url,
      tipo,
      autores,
      estado,
      comision,
      origen: origen as 'Camara' | 'Senado',
      legislatura
    }
  })

  return data
}

function indexOrError<T>(array: T[], index: number): T {
  if (index >= array.length) {
    throw new Error('Index out of bounds, index: ' + index + ', length: ' + array.length)
  }
  return array[index] as T
}

export function processDetailPage(raw: string): DetailData {
  const $ = load(raw)

  const rows = $('div .row_pr_ley').toArray()
  if (rows.length !== 8) {
    throw new Error('Unexpected number of rows: ' + rows.length)
  }

  const tituloCorto = $('div.titulocomision').text().trim()
  const estado = $('div.field--name-field-estadoley').text().trim()
  const tituloLargo = $(indexOrError(rows, 0)).find('div .title-pr-ley').text().trim()
  const autores = getAutores($(indexOrError(rows, 1)).text().trim())
  const comision = $(indexOrError(rows, 2)).find('a').text().trim()

  const numeroCamara = getNumeroCamara($(indexOrError(rows, 3)).find('div:nth-child(1)').text())
  const numeroSenado = getNumeroSenado($(indexOrError(rows, 3)).find('div:nth-child(2)').text())


  const legislatura = getLegislatura($(indexOrError(rows, 4)).find('div:nth-child(1) span.field__item').text())

  const origen = $(indexOrError(rows, 4)).find('div:nth-child(2) span.field__item').text().trim() ?? ''

  const tipo = $(indexOrError(rows, 6)).find('div:nth-child(1) span.field__item').text().trim()

  const objeto = $(indexOrError(rows, 7)).find('div:nth-child(1)').contents().filter(function() {
    return this.nodeType === 3
  }).text().trim();

  const observaciones = $(indexOrError(rows, 7)).find('div:nth-child(2) > p').text().trim()

  const result: DetailData = {
    tituloCorto,
    tituloLargo,
    autores,
    comision,
    numeroCamara,
    numeroSenado,
    legislatura,
    origen,
    estado,
    contenido: '',
    tipo,
    objeto,
    observaciones,
  }

  // logger.info(result)

  return result
}
