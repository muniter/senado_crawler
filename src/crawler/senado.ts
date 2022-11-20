import { Axios } from "axios";
import { processSenadoDetail, processSenadoList, ProyectoBasicData } from "./formatters";

class InvalidDataError extends Error {
  constructor(message: string, data: Record<string, any>) {
    super(`${message}: ${JSON.stringify(data)}`);
  }
}

export const Config = {
  URLS: {
    baseURL: "http://leyes.senado.gov.co",
    head: "/proyectos/index.php/proyectos-ley",
    query:
      "?option=com_joodb&view=catalog&format=html&reset=false&task=&search=&searchfield=&limit=0",
  },
} as const;

const Senado = new Axios({
  baseURL: Config.URLS.baseURL,
});

function legislaturaURL(cuatrenio: string, legislatura: string) {
  const url = `${Config.URLS.head}/cuatrenio-${cuatrenio}/${legislatura}${Config.URLS.query}`;
  console.log(`Url for cuatrenio ${cuatrenio} and legislatura ${legislatura} is ${Config.URLS.baseURL + url}`);
  return url;
}

async function getLegislaturaData(cuatrenio: string, legislatura: string) {
  const url = legislaturaURL(cuatrenio, legislatura);
  const { data, ...response } = await Senado.get(url);
  if (typeof data !== "string") {
    throw new InvalidDataError("Data is not a string", {
      cuatrenio,
      legislatura,
    });
  } else if (data.length === 0) {
    throw new InvalidDataError("Data is empty", { cuatrenio, legislatura });
  }
  if (!response.headers["content-type"]?.includes("text/html")) {
    throw new InvalidDataError(
      `Data is not html, content-type is: ${response.headers["content-type"]}`,
      { cuatrenio, legislatura }
    );
  }
  return data;
}

export async function getLegislaturaProyectsBasicData(
  cuatrenio: string,
  periodo: string
): Promise<ProyectoBasicData[]> {
  const rawData = await getLegislaturaData(cuatrenio, periodo);
  return processSenadoList(rawData);
}

export async function getProyectoDetails(url: string) {
  const { data } = await Senado.get(url);
  return processSenadoDetail(data);
}
