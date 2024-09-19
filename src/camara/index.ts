import { Axios } from 'axios'
import { processDetailPage, processPage as processRawPage } from './crawler/processor.js'
import { db } from '../database/index.js'
import * as crypto from 'crypto'
import PQueue from 'p-queue'
import assert from 'assert'
import { logger } from '../utils/logger.js'

export type CommonData = {
  numeroCamara: string
  numeroSenado: string | null
  tituloCorto: string
  tipo: string
  autores: string
  estado: string
  comision: string
  origen: 'Camara' | 'Senado' | string
  legislatura: string
}

export type ListData = CommonData & {
  url: string
}

export type DetailData = CommonData & {
  tituloLargo: string
  objeto: string
  contenido?: string
  observaciones?: string
}

export const config = {
  url: {
    base: 'https://www.camara.gov.co',
    head: '/secretaria/proyectos-de-ley',
    query:
      '?p=secretaria/proyectos-de-ley&field_periodo_legislativo_target_id={$legislaturaID}&field_estadoley_target_id=All&field_fastrack_value=All&field_tipo_taxonomia_target_id=All&field_origen_target_id=All&field_comision_proyecto_de_ley_target_id=All&limit=100&combine=&page={$page}'
  }
} as const

const Camara = new Axios({
  baseURL: config.url.base
})

function getPageUrl(legislaturaID: number, page: number) {
  return (
    config.url.head +
    config.url.query
      .replace('{$page}', page.toString())
      .replace('{$legislaturaID}', legislaturaID.toString())
  )
}

async function getPageRawData(url: string, attempts = 1): Promise<string> {
  console.info('Getting page data for url', url)
  let currentAttempt = 1
  let lastError: unknown | null = null

  while (currentAttempt <= attempts) {
    try {
      const result = await Camara.get(url)
      return result.data
    } catch (e: unknown) {
      lastError = e
      currentAttempt++
      console.error(
        `Error getting page data for url ${url}, attempt ${currentAttempt} of ${attempts}`
      )
    }
  }
  console.error(`Error getting page data for url ${url}, attempts limit reached`)
  throw lastError
}

export async function refreshCuatrenio(cuatrenio: string) {
  const legislaturas = await db
    .selectFrom('legislatura')
    .select('legislatura.title')
    .leftJoin('cuatrenio', 'cuatrenio.id', 'legislatura.cuatrenioId')
    .where('cuatrenio.title', '=', cuatrenio)
    .execute()

  if (legislaturas.length === 0) {
    console.info(`No legislaturas found for cuatrenio ${cuatrenio}`)
    process.exit(1)
  }

  for (const legislatura of legislaturas) {
    await refreshLegislaturaProyectosListData(legislatura.title)
    await refreshLegislaturaProyectosDetailData(legislatura.title)
  }
}

export async function refreshLegislaturaProyectosListData(legislatura: string) {
  const legislaturaData = await db
    .selectFrom('legislatura')
    .select('camaraId')
    .where('title', '=', legislatura)
    .executeTakeFirstOrThrow()

  let page = 0
  let proyectos = 0
  while (true) {
    const url = getPageUrl(legislaturaData.camaraId, page)
    console.info(`Getting page ${page} for legislatura ${legislatura}`)

    let data = null
    const raw = await getPageRawData(url, 3)
    try {
      data = processRawPage(raw)
    } catch (e) {
      console.error(`Error processing page ${page} for legislatura ${legislatura}`, e)
      process.exit(1)
    }

    proyectos += data.length
    if (data.length === 0) {
      console.info(`No more data for legislatura ${legislatura}, total proyectos: ${proyectos}`)
      break
    }
    await storeProyectoListData(data)
    page++
  }
}

export async function refreshLegislaturaProyectosDetailData(legislatura: string) {
  const proyectos = await db
    .selectFrom('camara')
    .selectAll()
    .where('legislatura', '=', legislatura)
    .where((eb) =>
      eb.or([
        eb('estado', 'not in', ['Archivado', 'Retirado']),
        // Makes sure we at least have scrapped the detail data one time.
        eb('detailDataHash', 'is', null),
        eb('url', 'is not', null)
      ])
    )
    .execute()

  const queue = new PQueue({ concurrency: 10 })
  for (const proyecto of proyectos) {
    queue.add(async () => {
      assert(proyecto.url, 'Proyecto url is null')
      return refreshProyectoDetailData({
        numeroCamara: proyecto.numeroCamara,
        url: proyecto.url
      })
    })
  }
  await queue.onIdle()
  logger.info(`Queue completed with ${proyectos.length} items`)
}

type RefreshProyectoDetailDataOptions = {
  numeroCamara: string
  url?: string
}

async function refreshProyectoDetailData(options: RefreshProyectoDetailDataOptions) {
  let fetchUrl: string

  if (options.url) {
    fetchUrl = options.url
  } else {
    const proyecto = await db
      .selectFrom('camara')
      .selectAll()
      .where('numeroCamara', '=', options.numeroCamara)
      .executeTakeFirstOrThrow()
    if (!proyecto.url) {
      throw new Error('No url for proyecto ' + options.numeroCamara)
    }
    fetchUrl = proyecto.url
  }

  console.info(`Refreshing detail data for proyecto: ${options.numeroCamara}`)
  try {
    const raw = await getPageRawData(fetchUrl, 2)
    const data = processDetailPage(raw)
    await storeProyectoDetailData(data)
  } catch (e) {
    console.error(
      `Error processing detail data for proyecto: ${options.numeroCamara}, url: ${fetchUrl}`,
      e
    )
    process.exit(1)
  }
}

export function buildCamaraUrl(url: string) {
  return config.url.base + url
}

function hashObject(data: ListData | DetailData) {
  // MD5 hash
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
}

function buildUpdateObjectFromListData(data: ListData) {
  return {
    numeroCamara: data.numeroCamara,
    numeroSenado: data.numeroSenado,
    tituloCorto: data.tituloCorto,
    tipo: data.tipo,
    autores: data.autores,
    estado: data.estado,
    comision: data.comision,
    origen: data.origen,
    legislatura: data.legislatura,
    url: data.url,
    listDataHash: hashObject(data)
  }
}

async function storeProyectoListData(listData: ListData[]) {
  console.info(`Storing list data for ${listData.length} records`)
  return db.transaction().execute(async (trx) => {
    for (const data of listData) {
      const exists = await trx
        .selectFrom('camara')
        .select('numeroCamara')
        .where('numeroCamara', '=', data.numeroCamara)
        .executeTakeFirst()

      if (!exists) {
        console.info('Inserting data for', data.numeroCamara)
        await trx.insertInto('camara').values(buildUpdateObjectFromListData(data)).execute()
      } else {
        const shouldUpdate = await trx
          .selectFrom('camara')
          .selectAll()
          .where('numeroCamara', '=', data.numeroCamara)
          .where((eb) =>
            eb.or([eb('listDataHash', 'is', null), eb('listDataHash', '!=', hashObject(data))])
          )
          .executeTakeFirst()

        if (shouldUpdate) {
          console.info('Updating data for', data.numeroCamara)
          await trx
            .updateTable('camara')
            .set(buildUpdateObjectFromListData(data))
            .where('numeroCamara', '=', data.numeroCamara)
            .execute()
        } else {
          console.info('Skipping data for', data.numeroCamara)
        }
      }
    }
  })
}

async function storeProyectoDetailData(data: DetailData) {
  const updateHash = hashObject(data)
  const shouldUpdate = await db
    .selectFrom('camara')
    .select('numeroCamara')
    .where('numeroCamara', '=', data.numeroCamara)
    .where((eb) =>
      eb.or([eb('detailDataHash', 'is', null), eb('detailDataHash', '!=', updateHash)])
    )
    .executeTakeFirst()

  if (shouldUpdate) {
    console.info(`Storing detail data for ${data.numeroCamara}`)
    await db
      .updateTable('camara')
      .set({
        numeroSenado: data.numeroSenado,
        tituloLargo: data.tituloLargo,
        tituloCorto: data.tituloCorto,
        tipo: data.tipo,
        autores: data.autores,
        estado: data.estado,
        comision: data.comision,
        origen: data.origen,
        legislatura: data.legislatura,
        objeto: data.objeto,
        contenido: data.contenido,
        observaciones: data.observaciones,
        detailDataHash: updateHash
      })
      .where('numeroCamara', '=', data.numeroCamara)
      .execute()
  } else {
    console.info(`Skipping detail data for ${data.numeroCamara}`)
  }
}

// refreshProyectosListData('2020-2021')
// refreshLegislaturaProyectosDetailData('2020-2021')
// refreshProyectoDetailData({ numeroCamara: '397/2019C' })
// getProyectosDetail();
