import { Axios } from "axios";
import { processSenadoList, ProyectoBasicData } from "./formatters";

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

function legislaturaURL(cuaternio: string, legislatura: string) {
  return `${Config.URLS.head}/cuaternio-${cuaternio}/${legislatura}${Config.URLS.query}`;
}

async function getLegislaturaData(cuaternio: string, legislatura: string) {
  const url = legislaturaURL(cuaternio, legislatura);
  const { data, ...response } = await Senado.get(url);
  if (typeof data !== "string") {
    throw new InvalidDataError("Data is not a string", {
      cuaternio,
      legislatura,
    });
  } else if (data.length === 0) {
    throw new InvalidDataError("Data is empty", { cuaternio, legislatura });
  }
  if (!response.headers["content-type"]?.includes("text/html")) {
    throw new InvalidDataError(
      `Data is not html, content-type is: ${response.headers["content-type"]}`,
      { cuaternio, legislatura }
    );
  }
  return data;
}

export async function getLegislaturaProyectsBasicData(
  cuaternio: string,
  periodo: string
): Promise<ProyectoBasicData[]> {
  const rawData = await getLegislaturaData(cuaternio, periodo);
  return processSenadoList(rawData);
}
