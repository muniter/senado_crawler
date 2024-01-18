import { Axios } from "axios"
import { processDetailPage, processPage as processRawPage } from "./crawler/processor"
import { db } from "../database"
import * as crypto from 'crypto'
import * as R from 'remeda'

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
    query: '?p=secretaria/proyectos-de-ley&field_periodo_legislativo_target_id={$legislaturaID}&field_estadoley_target_id=All&field_fastrack_value=All&field_tipo_taxonomia_target_id=All&field_origen_target_id=All&field_comision_proyecto_de_ley_target_id=All&limit=100&combine=&page={$page}'
  }
} as const

const Camara = new Axios({
  baseURL: config.url.base
})

function getPageUrl(legislaturaID: number, page: number) {
  return config.url.head + config.url.query.replace('{$page}', page.toString()).replace('{$legislaturaID}', legislaturaID.toString())
}

async function getPageRawData(url: string) {
  console.info('Getting page data for url', url)
  const result = await Camara.get(url, {
    timeout: 10000
  })

  return result.data
}

export async function refreshCuatrenio(cuatrenio: string) {
  const legislaturas = await db
    .selectFrom('Legislatura')
    .select('Legislatura.title')
    .leftJoin('Cuatrenio', 'Cuatrenio.id', 'Legislatura.cuatrenioId')
    .where('Cuatrenio.title', '=', cuatrenio)
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
  const legislaturaData = await db.selectFrom('Legislatura')
    .select('camaraId')
    .where('title', '=', legislatura)
    .executeTakeFirstOrThrow()

  let page = 0;
  let proyectos = 0
  while (true) {
    const url = getPageUrl(legislaturaData.camaraId, page)
    console.info(`Getting page ${page} for legislatura ${legislatura}`)
    const raw = await getPageRawData(url)

    let data = null
    try {
      data = processRawPage(raw)
    } catch (e) {
      console.error(`Error processing page ${page} for legislatura ${legislatura}`, e)
      process.exit(1)
    }

    proyectos += data.length
    if (data.length === 0) {
      console.info(`No more data for legislatura ${legislatura}, total proyectos: ${proyectos}`)
      break;
    }
    await storeProyectoListData(data)
    page++;
  }
}


export async function refreshLegislaturaProyectosDetailData(legislatura: string) {
  const proyectos = await db.selectFrom('CamaraProyectos')
    .selectAll()
    .where('legislatura', '=', legislatura)
    .where('estado', 'not in', ['Archivado', 'Retirado'])
    .execute()

  const chunks = R.chunk(R.filter(proyectos, (proyecto) => proyecto.url !== null), 10)

  for (const chunk of chunks) {
    await Promise.all(chunk.map((proyecto) => refreshProyectoDetailData({
      numeroCamara: proyecto.numeroCamara,
      url: proyecto.url!!
    })))
  }
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
    const proyecto = await db.selectFrom('CamaraProyectos')
      .selectAll()
      .where('numeroCamara', '=', options.numeroCamara)
      .executeTakeFirstOrThrow()
    if (!proyecto.url) {
      throw new Error('No url for proyecto ' + options.numeroCamara)
    }
    fetchUrl = proyecto.url
  }

  console.info(`Refreshing detail data for proyecto: ${options.numeroCamara}`)
  const raw = await getPageRawData(fetchUrl)
  try {
    const data = processDetailPage(raw)
    await storeProyectoDetailData(data)
  } catch (e) {
    console.error(`Error processing detail data for proyecto: ${options.numeroCamara}, url: ${fetchUrl}`, e)
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
    listDataHash: hashObject(data),
  }
}


async function storeProyectoListData(listData: ListData[]) {
  console.info(`Storing list data for ${listData.length} records`)
  return db.transaction().execute(async (trx) => {

    for (const data of listData) {
      const exists = await trx.selectFrom('CamaraProyectos')
        .select('numeroCamara')
        .where('numeroCamara', '=', data.numeroCamara)
        .executeTakeFirst()

      if (!exists) {
        console.info('Inserting data for', data.numeroCamara)
        await trx.insertInto('CamaraProyectos')
          .values(buildUpdateObjectFromListData(data))
          .execute()
      } else {
        const shouldUpdate = await trx.selectFrom('CamaraProyectos')
          .selectAll()
          .where('numeroCamara', '=', data.numeroCamara)
          .where((eb) => eb.or([
            eb('listDataHash', 'is', null),
            eb('listDataHash', '!=', hashObject(data))
          ]))
          .executeTakeFirst()


        if (shouldUpdate) {
          console.info('Updating data for', data.numeroCamara)
          await trx.updateTable('CamaraProyectos')
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
  const shouldUpdate = await db.selectFrom('CamaraProyectos')
    .select('numeroCamara')
    .where('numeroCamara', '=', data.numeroCamara)
    .where((eb) => eb.or([
      eb('detailDataHash', 'is', null),
      eb('detailDataHash', '!=', updateHash)
    ]))
    .executeTakeFirst()

  if (shouldUpdate) {
    console.info(`Storing detail data for ${data.numeroCamara}`)
    await db.updateTable('CamaraProyectos')
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
        detailDataHash: updateHash,
      })
      .where('numeroCamara', '=', data.numeroCamara)
      .execute()
  } else {
    console.info(`Skipping detail data for ${data.numeroCamara}`)
  }
}

// refreshProyectosListData('2020-2021')
// refreshLegislaturaProyectosDetailData('2020-2021')
// refreshProyectoDetailData({ numeroCamara: '643/2021C' })
// getProyectosDetail();
