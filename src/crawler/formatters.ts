import { load, Cheerio, CheerioAPI, Element } from "cheerio";
import { Config } from "./senado";

const numeroIdentificadorRegex = /(?<numero>\d+)\/(?<year>\d+)?/;

type CElement = Cheerio<Element>;
type Comision = string;
interface Estado {
  estado: string;
  anotacion?: string;
}

export interface NumeroIdentificador {
  numero: number;
  year: number;
}
export type ProyectoBasicData = {
  comision: string;
  estado: Estado;
  titulo: string;
  autores: string[];
  numeroSenado: NumeroIdentificador;
  proyectosAcumulados: NumeroIdentificador[];
  numeroCamara?: NumeroIdentificador;
  fechaRadicado: Date;
  url: string;
};

export type ProyectoDetailData = {
  origen: string;
  tipoLey: string;
  fechaEnvioComision: string;
  ponentes: {
    debate: number;
    ponente: string;
  }[];
  conciliadores: string[];
}


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

function parseTextualDate(raw: string): Date {
  let fecha: Date;
  const [day, month, year] = raw.split(" ");
  const monthNumber = meses.get(month.toLowerCase());
  if (monthNumber) {
    fecha = new Date(parseInt(year), monthNumber, parseInt(day));
    return fecha;
  }
  throw new Error("No se pudo encontrar la fecha en el texto: " + raw);
}

function getFechaRadicado($: CheerioAPI, cell: CElement): Date {
  // First bold iside the first div
  const textDate = $(cell).find("div > b").eq(0).text().trim();
  return parseTextualDate(textDate);
}

function parseNumeroIdentificador(
  match: RegExpMatchArray | null,
  defaultYear?: number
): NumeroIdentificador {
  if (match === null) {
    throw new Error("No se pudo encontrar el numero de identificador");
  }
  if (match.groups) {
    if (!match.groups.numero) {
      throw new Error("No se encontró el número del número identificador");
    }
    const numero = parseInt(match.groups.numero);
    const year = match.groups.year ? parseInt(match.groups.year) : defaultYear;
    if (!year) {
      throw new Error(
        "No se encontró el año del número identificador, y no se dio uno por defecto"
      );
    }
    return { numero, year };
  }
  throw new Error("No se encontró el número identificador");
}

/**
 * @description Parsea el número de senado, y los proyectos acumulados
 */
function getNumeroSenado(
  $: CheerioAPI,
  cell: CElement
): { numero: NumeroIdentificador; acumulados: NumeroIdentificador[] } {
  // El contenido
  const raw = $(cell).find("div > b").eq(1).text().trim().toLowerCase();
  // Primero se extrae el número identificador del proyecto
  const numeroMatch = raw.match(numeroIdentificadorRegex);
  const numeroSenado = parseNumeroIdentificador(numeroMatch);

  // TODO; La lógica de la acumulación de los proyectos no es clara.
  // Es decir el proyecto acumula, o es acumulado.
  // Podría implementarse una heuristica como:
  // Si se encuentra más de un acumulado, la lógica diría que es acumulador
  // Si se encuentra la palabra acumulado se entiente que el fue acumulado
  // Lo mejor sería quizás decir que los proyectos son relacionados.

  // Luego se procede a extraer los acumulados si existen
  const acumulados: NumeroIdentificador[] = [];
  if (numeroMatch && numeroMatch.index && raw.includes("acum")) {
    let substring = raw.substring(
      numeroMatch.index + numeroMatch.reduce((acc, val) => acc + val.length, 0)
    );
    const rest = substring.matchAll(new RegExp(numeroIdentificadorRegex, "g"));
    for (const match of rest) {
      try {
        acumulados.push(parseNumeroIdentificador(match, numeroSenado.year));
      } catch (e: any) {
        // Add the fact the error was parsing the acumulados
        throw new Error(
          `Error al parsear los acumulados match: (${match.groups}): ` +
          e.message
        );
      }
    }
  }
  return { numero: numeroSenado, acumulados };
}

function getNumeroCamara(
  $: CheerioAPI,
  cell: CElement
): NumeroIdentificador | undefined {
  // It's found in this format Cámara: {numero} |
  const raw = $(cell).find("div .small > b").eq(2).text().trim().toLowerCase();
  const match = raw.match(numeroIdentificadorRegex);
  if (match) {
    return parseNumeroIdentificador(match);
  }
}

function getAutores($: CheerioAPI, cell: CElement): string[] {
  // It's found in this format Autores: {autores} |
  const raw = $(cell).find("p > b").first().text().trim();
  return processListOfPersons(raw);
}

function processListOfPersons(raw: string): string[] {
  let autores = raw.replace(/("|')/g, "").split(/,|;|\n/);
  autores = autores
    .map((autor) => autor.trim())
    .filter((autor) => autor.match(/\w{5,}/))

  const unique = new Set(autores);
  return [...unique];
}

function getTitulo($: CheerioAPI, cell: CElement): string {
  const text = $(cell).find("h3 > a").first().text().trim();
  // Remove trailing and leading spaces and quotes
  return text
    .replace("\n", "")
    .replace(/\.$/, "")
    .trimEnd()
    .replace(/^['"”“]/, "")
    .replace(/['"”“]$/, "")
    .replace(/\s\s+/, " ");
}

const getUrl = ($: CheerioAPI, cell: CElement): string => {
  // h3 that has an a with an href
  const url = $(cell).find("h3 > a").attr("href");
  if (!url) {
    throw new Error("No se encontró la url del proyecto");
  }
  return Config.URLS.baseURL + url;
};

function processComisionCell($: CheerioAPI, table: CElement): Comision {
  const comision = $(table).find("td").eq(0).text().trim();
  if (comision == "-") {
    return "NO ASIGNADA";
  }
  return comision;
}

function processEstadoCell($: CheerioAPI, table: CElement): Estado {
  const cell = $(table).find("td").eq(1);
  // Get only the text of the partent (the state is there), the annotation is
  // in a <p></p> tag inside the cell
  const estado = cell
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .replace("\n", "")
    .trim();
  const anotacion = cell.find("p").text().replace("\n", "").trim();
  return { estado, anotacion };
}

function proccessTitleCell($: CheerioAPI, table: CElement) {
  const cell = $(table).find("td").eq(2);
  const titulo = getTitulo($, cell);
  const url = getUrl($, cell);
  const fechaRadicado = getFechaRadicado($, cell);
  const datosNumeroSenado = getNumeroSenado($, cell);
  const numeroCamara = getNumeroCamara($, cell);
  const autores = getAutores($, cell);
  return {
    titulo,
    url,
    autores,
    numeroSenado: datosNumeroSenado.numero,
    proyectosAcumulados: datosNumeroSenado.acumulados,
    numeroCamara,
    fechaRadicado,
  };
}

export function processRow($: CheerioAPI, table: CElement): ProyectoBasicData {
  const comision = processComisionCell($, table);
  const estado = processEstadoCell($, table);
  const titleExtractedData = proccessTitleCell($, table);
  return {
    comision,
    estado,
    ...titleExtractedData,
  };
}

export function processSenadoList(raw: string): ProyectoBasicData[] {
  const $ = load(raw);
  const result: ProyectoBasicData[] = [];
  const tables = $("table");
  for (let i = 0; i < tables.length; i++) {
    const el = tables.eq(i);
    if (!isValidRow($, el)) {
      continue;
    }
    try {
      result.push(processRow($, el));
    } catch (e: any) {
      console.error(`Error al procesar la fila ${i}: ${e.message}`);
      console.debug(`Failed processing row data: ${el.html()}`);
    }
  }
  return result;
}

function isValidRow($: CheerioAPI, table: CElement) {
  // TODO: This heuristic could be improved
  return (
    $(table).find("td").length === 3 &&
    $(table).find(".even, .odd").length === 1
  );
}

export function processSenadoDetail(raw: string) {
  const $ = load(raw);
  return {
    origen: getOrigen($),
    tipoLey: getTipoDeLey($),
    fechaEnvioComision: getFechaEnvioComision($),
    ponentes: [...getPonentesPrimerDebate($), ...getPonentesSegundoDebate($)],
    conciliadores: getConciliadoresSenado($),
  }
}

export function getOrigen($: CheerioAPI): string {
  // TODO; Se puede dejar el origen solo en dos, cuales son los valores posibles?
  const raw = $("td:contains('Origen:')").next('td').text().trim();
  return raw;
}

export function getTipoDeLey($: CheerioAPI): string {
  const raw = $("td:contains('Tipo de Ley:')").next('td').text().trim();
  return raw;
}

export function getFechaEnvioComision($: CheerioAPI): string {
  const raw = $("td:contains('Fecha de Envio a Comisión:')").next('td').text().trim();
  return raw;
}

export function getPonentesPrimerDebate($: CheerioAPI) {
  const raw = $("td:contains('Ponente Primer Debate:')").next('td').text().trim();
  return processListOfPersons(raw).map((p) => ({ debate: 1, ponente: p }));
}

export function getPonentesSegundoDebate($: CheerioAPI) {
  const raw = $("td:contains('Ponente Segundo Debate:')").next('td').text().trim();
  return processListOfPersons(raw).map((p) => ({ debate: 2, ponente: p }));
}

export function getConciliadoresSenado($: CheerioAPI) {
  const raw = $("td:contains('Conciliador senado:')").next('td').text().trim();
  return processListOfPersons(raw);
}
