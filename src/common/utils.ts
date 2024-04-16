import { Cheerio, CheerioAPI, Element } from 'cheerio'
import { NumeroIdentificador } from '../senado/senado/list-processor'

export const numeroIdentificadorRegex = /(?<numero>\d+)\/(?<year>\d+)?/

export function parseNumeroIdentificador(raw: string) {
  const match = raw.match(numeroIdentificadorRegex)
  return parseNumeroIdentificadorFromRegex(match)
}

function parseNumeroIdentificadorFromRegex(
  match: RegExpMatchArray | null,
  defaultYear?: number
): NumeroIdentificador {
  if (match === null) {
    throw new Error('No se pudo encontrar el numero de identificador')
  }
  if (match.groups) {
    if (!match.groups.numero) {
      throw new Error('No se encontró el número del número identificador')
    }
    const numero = parseInt(match.groups.numero)
    const year = match.groups.year ? parseInt(match.groups.year) : defaultYear
    if (!year) {
      throw new Error('No se encontró el año del número identificador, y no se dio uno por defecto')
    }
    return { numero, year }
  }
  throw new Error('No se encontró el número identificador')
}

export function getNumeroSenado(
  rawData: string,
): { numero: NumeroIdentificador; acumulados: NumeroIdentificador[] } {
  // El contenido
  const raw = rawData.trim().toLowerCase()
  // Primero se extrae el número identificador del proyecto
  const numeroMatch = raw.match(numeroIdentificadorRegex)
  const numeroSenado = parseNumeroIdentificadorFromRegex(numeroMatch)

  // TODO; La lógica de la acumulación de los proyectos no es clara.
  // Es decir el proyecto acumula, o es acumulado.
  // Podría implementarse una heuristica como:
  // Si se encuentra más de un acumulado, la lógica diría que es acumulador
  // Si se encuentra la palabra acumulado se entiente que el fue acumulado
  // Lo mejor sería quizás decir que los proyectos son relacionados.

  // Luego se procede a extraer los acumulados si existen
  const acumulados: NumeroIdentificador[] = []
  if (numeroMatch && numeroMatch.index !== undefined && raw.includes('acum')) {
    let substring = raw.substring(
      numeroMatch.index + numeroMatch.reduce((acc, val) => acc + val.length, 0)
    )
    const rest = substring.matchAll(new RegExp(numeroIdentificadorRegex, 'g'))
    for (const match of rest) {
      try {
        acumulados.push(parseNumeroIdentificadorFromRegex(match, numeroSenado.year))
      } catch (e: any) {
        // Add the fact the error was parsing the acumulados
        throw new Error(`Error al parsear los acumulados match: (${match.groups}): ` + e.message)
      }
    }
  }
  return { numero: numeroSenado, acumulados }
}


const meses = new Map<string, number>([
  ['enero', 1],
  ['febrero', 2],
  ['marzo', 3],
  ['abril', 4],
  ['mayo', 5],
  ['junio', 6],
  ['julio', 7],
  ['agosto', 8],
  ['septiembre', 9],
  ['octubre', 10],
  ['noviembre', 11],
  ['diciembre', 12]
])

export function parseTextualDate(raw: string): Date {
  let [rawDay, rawMonth, rawYear] = raw.replace(/\s+/, ' ').split(' ')
  if (rawDay && rawMonth && rawYear && rawYear !== '0000') {
    const day = parseInt(rawDay);
    const year = parseInt(rawYear);
    const monthNumber = meses.get(rawMonth.toLowerCase())
    if (monthNumber && !isNaN(day) && !isNaN(year)) {
      return new Date(year, monthNumber - 1, day)
    }
  }
  throw new Error('No se pudo encontrar la fecha en el texto: ' + raw)
}

export function processListOfPersonas(raw: string): string[] {
  let items = raw
    .replaceAll('\t', ' ')
    .replace(/("|')/g, '')
    .split(/,|;|\n/)
  items = items.map((autor) => autor.trim()).filter((autor) => autor.match(/\w{5,}/))

  const unique = new Set(items)
  return [...unique]
}
