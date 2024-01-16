import { load } from 'cheerio';
import { buildCamaraUrl, ListData } from '..';

const numeroCamaraRegex = /\d+\/\d+C/
const numeroSenadoRegex = /\d+\/\d+S/
const dateRegex = /\d{4}-\d{2}-\d{2}/

export function processPage(raw: string): ListData[] {
  const $ = load(raw)
  const rows = $('tbody tr').toArray()
  const data = rows.map((row) => {
    const columns = $(row).find('td').toArray()
    const numeroCamara = $(columns[0]).text().trim()
    const numeroSenado = $(columns[1]).text().trim()
    const tituloCorto = $(columns[2]).text().trim()
    const url = buildCamaraUrl($(columns[2]).find('a').attr('href') ?? '')
    const tipo = $(columns[3]).text().trim()
    const autores = $(columns[4]).text().trim()
    const estado = $(columns[5]).text().trim()
    const comision = $(columns[6]).text().trim()
    const origen = $(columns[7]).text().trim()
    const legislatura = $(columns[8]).text().trim()

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

export function processDetailPage(raw: string) {
  const $ = load(raw)

  const rows = $('div .row_pr_ley').toArray()
  if (rows.length !== 8) {
    throw new Error('Unexpected number of rows: ' + rows.length)
  }

  const tituloLargo = $(indexOrError(rows, 0)).find('div .title-pr-ley').text().trim()
  // TODO
  const autores = '';
  const comision = $(indexOrError(rows, 2)).find('a').text().trim()

  let numeroCamaraMatcher = $(indexOrError(rows, 3)).find('div:nth-child(1)').text().match(numeroCamaraRegex)
  let numeroCamara: string;
  if (numeroCamaraMatcher) {
    numeroCamara = numeroCamaraMatcher[0].trim()
  } else {
    throw new Error('Could not find numeroCamara')
  }

  let numeroSenadoMatcher = $(indexOrError(rows, 3)).find('div:nth-child(1)').text().match(numeroSenadoRegex)
  let numeroSenado: string|null = null;
  if (numeroSenadoMatcher) {
    numeroSenado = numeroSenadoMatcher[0].trim()
  }

  const legislatura = $(indexOrError(rows, 4)).find('div:nth-child(1) span.field__item').text().trim()

  const origen = $(indexOrError(rows, 4)).find('div:nth-child(2) span.field__item').text().trim()

  const fechaRadicacionCamaraMatcher = $(indexOrError(rows, 5)).find('div:nth-child(1)').text().match(dateRegex)
  const fechaRadicacionCamara = fechaRadicacionCamaraMatcher ? fechaRadicacionCamaraMatcher[0].trim() : null

  const fechaRadicacionSenadoMatcher = $(indexOrError(rows, 5)).find('div:nth-child(2)').text().match(dateRegex)
  const fechaRadicacionSenado = fechaRadicacionSenadoMatcher ? fechaRadicacionSenadoMatcher[0].trim() : null

  const tipoLey = $(indexOrError(rows, 6)).find('div:nth-child(1) span.field__item').text().trim()

  const objeto = $(indexOrError(rows, 7)).find('div:nth-child(1)').contents().filter(function () {
    return this.nodeType === 3
  }).text().trim();

  const observaciones = $(indexOrError(rows, 7)).find('div:nth-child(2) > p').text().trim()

  const result = {
    tituloLargo,
    autores,
    comision,
    numeroCamara,
    numeroSenado,
    legislatura,
    origen,
    fechaRadicacionCamara,
    fechaRadicacionSenado,
    tipoLey,
    objeto,
    observaciones,
  }
  console.log(result)
}
