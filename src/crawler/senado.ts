import { Axios } from "axios";
import * as cheerio from "cheerio";
import { Element } from "cheerio";
import { processComision, processEstado, processPagina, processTitle } from "./formatters";


export const Config = {
  URLS: {
    baseURL: "http://leyes.senado.gov.co",
    head: "/proyectos/index.php/proyectos-ley",
    query: "?option=com_joodb&view=catalog&format=html&reset=false&task=&search=&searchfield=&limit=0",
  },
  Proyectos: {
    cuaternios: {
      "2018-2022": { start: 2018, end: 2022, subperiodos: ["2018-2019", "2019-2020", "2020-2021", "2021-2022"] },
      "2022-2026": { start: 2022, end: 2026, subperiodos: ["2022-2023"] },
    },
  },
} as const;

const Senado = new Axios({
  baseURL: Config.URLS.baseURL,
});

type CuaternioKey = keyof typeof Config.Proyectos.cuaternios;

export interface NumeroIdentificador { numero: number, year: number }
export interface Estado {
  estado: string,
  anotacion?: string,
}

type ProyectoBasicData = {
  comision: string;
  estado: Estado;
  titulo: string;
  autores?: string[];
  numeroSenado: NumeroIdentificador;
  proyectosAcumulados: NumeroIdentificador[];
  numeroCamara?: NumeroIdentificador;
  fechaRadicado: Date;
  pagina: string;
};

interface PeriodoUrl { periodo: string, url: string }
function cuaternioURLs({ start, end, subperiodos, }: {
  start: number;
  end: number;
  subperiodos: readonly string[];
}): PeriodoUrl[] {
  const urls: PeriodoUrl[] = subperiodos.map((subperiodo) => {
    return { periodo: subperiodo, url: `${Config.URLS.head}/cuatrenio-${start}-${end}/${subperiodo}${Config.URLS.query}` };
  });
  return urls;
}

async function getPeriodoData(cuaternio: CuaternioKey, periodo: string) {
  const cuaternioConfig = Config.Proyectos.cuaternios[cuaternio];
  const cuaterion_urls = cuaternioURLs(cuaternioConfig);
  const url = cuaterion_urls.find((url) => url.periodo === periodo)?.url;
  if (!url) {
    throw new Error(`No se encontró la url para el periodo ${periodo}`);
  }
  const { data, ...response } = await Senado.get(url);
  if (typeof data !== "string") {
    throw new Error("Data is not a string");
  } else if (data.length === 0) {
    throw new Error("Data is empty");
  }
  if (!response.headers["content-type"]?.includes("text/html")) {
    throw new Error("Data is not html, it is " + response.headers["content-type"]);
  }
  return data;
}

async function getPeriodoProyects(cuaternio: CuaternioKey, periodo: string): Promise<ProyectoBasicData[]> {
  // Get the url data
  const $ = cheerio.load(await getPeriodoData(cuaternio, periodo));
  function isProyectRow(_index: number, table: Element) {
    // TODO: This heuristic could be improved
    return $(table).find("td").length === 3 && $(table).find(".even, .odd").length === 1;
  }

  // Each table is a row of data
  const tables = $("table").filter(isProyectRow);
  console.log("Proyect number: ", tables.length);

  function processProyect(table: Element) {
    const columns = $(table).find('td');
    if (columns.length !== 3) {
      throw new Error("Columns length is not 3, it is " + columns.length);
    }
    try {
      // The text on the element without children is the state
      const estado = columns.eq(1);
      const title = columns.eq(2);
      const header = title.find("h3").text();
      const pagina = title.find("a").attr("href");
      return {
        comision: processComision(columns.eq(0).text()),
        estado: processEstado(estado.contents().not(estado.children()).text(), estado.find("p").text()),
        pagina: processPagina(pagina),
        ...processTitle(header, columns.eq(2).text()),
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  return tables.map((_, table) => processProyect(table)).toArray();
}

export async function getAPeriod() {
  Object.entries(Config.Proyectos.cuaternios).forEach(([cuaternio, cuaternioConfig]) => {
    cuaternioConfig.subperiodos.forEach((periodo) => {
      getPeriodoProyects(cuaternio as CuaternioKey, periodo).then((proyects) => {
        console.log(JSON.stringify(proyects, null, 2));
      })
    })
  })
}

getAPeriod();
