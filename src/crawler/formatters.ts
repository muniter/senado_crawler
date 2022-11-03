import { Config, Estado, NumeroIdentificador } from "./senado";

const meses = new Map<string, number>([
  ["enero", 1],
  ["febrero", 2],
  ["marzo", 3],
  ["abril", 4],
  ["mayo", 5],
  ["junio", 6],
  ["julio", 7],
  ["agosto", 8],
  ["septiembre", 9],
  ["octubre", 10],
  ["noviembre", 11],
  ["diciembre", 12],
]);



function getComision(comision: string) {
  return comision.trim()
}

function getEstado(estado: string) {
  return estado.trim()
}

function getEstadoAnotaciones(anotacion: string) {
  return anotacion.trim()
}

function getTitulo(raw: string) {
  let result: string = raw.trim().replace(/^("|')/, "").replace(/("|')$/, "")
  return result
}

function getFechaRadicado(raw: string): Date {
  // It's found in this format F Radicado: {fecha} |
  const match = raw.match(/F Radicado: (?<fecha>\d.*?\d) \|/)
  if (match && match.groups?.fecha) {
    let fecha: Date
    const fullFecha = match.groups.fecha.trim()
    const [day, month, year] = fullFecha.split(" ")
    const monthNumber = meses.get(month.toLowerCase())
    if (monthNumber) {
      fecha = new Date(parseInt(year), monthNumber, parseInt(day))
      return fecha
    }
  }
  throw new Error("No se pudo encontrar la fecha de radicado: " + raw)
}

function parseNumeroIdentificador(match: RegExpMatchArray, defaultYear?: number): NumeroIdentificador {
  if (match.groups) {
    if (!match.groups.numero) {
      throw new Error("No se encontró el número del número identificador")
    }
    const numero = parseInt(match.groups.numero)
    const year = match.groups.year ? parseInt(match.groups.year) : defaultYear
    if (!year) {
      throw new Error("No se encontró el año del número identificador, y no se dio uno por defecto")
    }
    return { numero, year }
  }
  throw new Error("No se encontró el número identificador")
}

function getNumeroSenado(raw: string): { numero: NumeroIdentificador, acumulados: NumeroIdentificador[] } {
  let numero: NumeroIdentificador
  let acumulados: NumeroIdentificador[] = []
  const numIdRegex = /(?<numero>\d+)\/(?<year>\d+)?/
  // It's found in this format Senado: {numero} |
  const match = raw.match(/Senado: (?<contenido>.*?) \|/)
  if (match && match.groups?.contenido) {
    let contenido = match.groups.contenido.trim().toLowerCase()
    let res = contenido.match(numIdRegex)
    // The first match is always the main one
    if (!res) {
      throw new Error("No se encontró el número de senado" + raw)
    }
    numero = parseNumeroIdentificador(res)
    if (contenido.includes("acu")) {
      // Subsrting the rest
      contenido = contenido.substring(res.index! + res[0].length)
      // Find the rest of the numbers
      const rest = contenido.matchAll(new RegExp(numIdRegex, "g"))
      for (const match of rest) {
        try {
          acumulados.push(parseNumeroIdentificador(match, numero.year))
        } catch (e: any) {
          // Add the fact the error was parsing the acumulados
          throw new Error(`Error al parsear los acumulados match: (${match.groups}): ` + e.message)
        }
      }
    }
    return { numero, acumulados }
  }
  throw new Error("No se encontró el número de senado" + raw)
}

function getNumeroCamara(raw: string) {
  // It's found in this format Cámara: {numero} |
  const match = raw.match(/C(á|a)mara: (?<numero>\d+\\\d+) \|/)
  if (match) {
    return parseNumeroIdentificador(match)
  }
}

function getAutores(raw: string) {
  // It's found in this format Autores: {autores} |
  const match = raw.match(/Autores: (?<autores>.*)/)
  if (match && match.groups?.autores) {
    let autores = match.groups.autores.trim().replace(/("|')/g, "").replace(/\n/g, "").split(",")
    autores = autores.map((autor) => autor.trim())
    return autores
  }
}

export function processComision(raw: string): string {
  console.log("Processing comision: " + raw)
  const comision = getComision(raw)
  return comision
}

export function processTitle(header: string, raw: string) {
  const titulo = getTitulo(header)
  const fechaRadicado = getFechaRadicado(raw)
  const numeroSenado = getNumeroSenado(raw)
  const numeroCamara = getNumeroCamara(raw)
  const autores = getAutores(raw)

  return {
    titulo,
    autores,
    fechaRadicado,
    numeroSenado: numeroSenado.numero,
    proyectosAcumulados: numeroSenado.acumulados,
    numeroCamara,
  }
}

export function processEstado(estado: string, anotacion?: string): Estado {
  estado = getEstado(estado)
  if (anotacion && anotacion !== "") {
    anotacion = getEstadoAnotaciones(anotacion)
  }
  return { estado, anotacion }
}

export function processPagina(raw?: string) {
  if (!raw) {
    throw new Error("No se encontró el link")
  }
  return Config.URLS.baseURL + raw
}
