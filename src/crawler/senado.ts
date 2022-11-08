import { Axios } from "axios";
import { processSenadoList, ProyectoBasicData } from "./formatters";


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
  const rawData = await getPeriodoData(cuaternio, periodo);
  return processSenadoList(rawData);
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
