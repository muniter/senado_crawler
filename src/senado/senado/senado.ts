import { Axios } from 'axios'
import { processSenadoList, ProyectoBasicData } from './list-processor'
import { processSenadoDetail } from './detail-processor'
import { formatNumeroLegislativo } from './index'
import { assert } from 'console'

class InvalidDataError extends Error {
  constructor(message: string, data: Record<string, any>) {
    super(`${message}: ${JSON.stringify(data)}`)
  }
}

export const Config = {
  URLS: {
    baseURL: 'http://leyes.senado.gov.co',
    head: '/proyectos/index.php/proyectos-ley',
    query:
      '?option=com_joodb&view=catalog&format=html&reset=false&task=&search=&searchfield=&limit=0'
  }
} as const

const Senado = new Axios({
  baseURL: Config.URLS.baseURL
})

function legislaturaURL(cuatrenio: string, legislatura: string) {
  const url = `${Config.URLS.head}/cuatrenio-${cuatrenio}/${legislatura}${Config.URLS.query}`
  console.log(
    `Url for cuatrenio ${cuatrenio} and legislatura ${legislatura} is ${Config.URLS.baseURL + url}`
  )
  return url
}

async function getLegislaturaData(cuatrenio: string, legislatura: string) {
  console.log('Getting legislatura data')
  const url = legislaturaURL(cuatrenio, legislatura)
  const { data, ...response } = await Senado.get(url, {
    timeout: 10000,
  })
  console.log(`Got legislatura data, status: ${response.status}`)
  if (typeof data !== 'string') {
    throw new InvalidDataError('Data is not a string', {
      cuatrenio,
      legislatura
    })
  } else if (data.length === 0) {
    throw new InvalidDataError('Data is empty', { cuatrenio, legislatura })
  }
  if (!response.headers['content-type']?.includes('text/html')) {
    throw new InvalidDataError(
      `Data is not html, content-type is: ${response.headers['content-type']}`,
      { cuatrenio, legislatura }
    )
  }
  return data
}

async function getDetalleData(url: string) {
  const { data, ...response } = await Senado.get(url, {
    timeout: 10000,
  })
  if (typeof data !== 'string') {
    throw new InvalidDataError('Data is not a string', { url })
  } else if (data.length === 0) {
    throw new InvalidDataError('Data is empty', { url })
  }
  if (!response.headers['content-type']?.includes('text/html')) {
    throw new InvalidDataError(
      `Data is not html, content-type is: ${response.headers['content-type']}`,
      { url }
    )
  }
  return data
}

export async function getLegislaturaProyectsBasicData(
  cuatrenio: string,
  periodo: string
): Promise<ProyectoBasicData[]> {
  const rawData = await getLegislaturaData(cuatrenio, periodo)
  return processSenadoList(rawData)
}

export async function getProyectoDetails({ url, numero }: { url: string, numero: string }) {
  try {
    const processed = processSenadoDetail(await getDetalleData(url))
    assert(
      formatNumeroLegislativo(processed.numero) == numero,
      `El número de senado no concuerda, esperado ${numero}, obtenido ${processed.numero}`
    )
    console.log(`Procesado detalles del html del proyecto: ${numero}`)
    return processed
  } catch (error: any) {
    console.error(`Error procesando los detalles del proyecto ${numero}, error: ${error?.message}`)
    console.error(`Url: ${url}`)
  }
}
