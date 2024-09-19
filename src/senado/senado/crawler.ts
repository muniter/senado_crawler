import { type Cheerio, type CheerioAPI, load } from 'cheerio'
import {
  cleanupTitle,
  parseListOfNames,
  parseNumeroIdentificador,
  parseTextualDate
} from '../../common/utils.js'
import { Axios } from 'axios'
import { logger } from '../../utils/logger.js'
import PQueue from 'p-queue'
import type { Element } from '../../common/types.js'

export interface ProyectDetailPageData {
  numero: string
  numero_camara: string | null
  titulo: string
  estado: string
  estado_anotacion: string
  comision: string
  fecha_radicado: Date
  origen: string
  tipo_ley: string
  fecha_envio_comision: Date | null
  fechaPresentacion: Date
  fecha_aprobacion_primer_debate: Date | null
  fecha_aprobacion_segundo_debate: Date | null
  fecha_conciliacion: Date | null
  autores: string[]
  exposicion_motivos: string | null
  primera_ponencia: string | null
  segunda_ponencia: string | null
  texto_plenaria: string | null
  conciliacion: string | null
  objeciones: string | null
  concepto: string | null
  texto_rehecho: string | null
  sentencia_corte: string | null
}

export type DetailData = ProyectDetailPageData & {
  id_senado: number
  legislatura: string
  url: string
}

export class Extractor {
  private axios: Axios
  private urlConfig = {
    baseURL: 'http://leyes.senado.gov.co',
    head: '/proyectos/index.php/proyectos-ley',
    query:
      '?option=com_joodb&view=catalog&format=html&reset=false&task=&search=&searchfield=&limit=0'
  }

  constructor(
    private cuatrenio: string,
    private legislatura: string
  ) {
    this.axios = new Axios({
      baseURL: this.urlConfig.baseURL,
      timeout: 10000
    })
  }

  async getHtml(url: string, options: { retries: number } = { retries: 3 }) {
    const retries = options?.retries ?? 2
    let attempt = 1
    while (attempt <= retries) {
      try {
        const { data } = await this.axios.get(url)
        if (typeof data !== 'string') {
          throw new Error('Invalid data')
        }
        return data
      } catch (e) {
        logger.error(`Error fetching ${this.axios.defaults.baseURL}${url}`)
        attempt++
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts`)
  }

  private listDataUrl() {
    return `${this.urlConfig.head}/cuatrenio-${this.cuatrenio}/${this.legislatura}${this.urlConfig.query}`
  }

  public async process(): Promise<DetailData[]> {
    const data = await this.getHtml(this.listDataUrl())
    const { items } = new ProyectoPaListPage(data)
    const results: DetailData[] = []

    logger.info(`Processing ${items.length} items`)

    const queue = new PQueue({ concurrency: 10 })
    queue.on(
      'completed',
      () => results.length % 10 === 0 && logger.info(`Processed ${results.length}/${items.length}`)
    )

    items.forEach((item) =>
      queue.add(async () => {
        await this.#processOne(item).then((data) => data && results.push(data))
      })
    )
    await queue.onIdle()
    logger.info(`Queue completed with ${results.length} items`)

    return results
  }

  async #processOne(item: ParsedListItem): Promise<DetailData | undefined> {
    logger.debug(`Processing item ${item.id}`)
    const data = await this.getHtml(item.url)
    const url = `${this.urlConfig.baseURL}${item.url}`
    try {
      const detail = new ProyectoDetailPage(data).parse()
      logger.debug(`Processed item ${item.id}`)
      return {
        ...detail,
        id_senado: item.id,
        legislatura: this.legislatura,
        url
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      logger.error(`Error processing item ${item.id}: ${message}\n Url: ${url}`)
    }
  }
}

type ParsedListItem = {
  id: number
  url: string
}

// Parse, and extract the rows, producing row objects
class ProyectoPaListPage {
  private $: CheerioAPI
  public items: ParsedListItem[] = []

  constructor(raw: string) {
    this.$ = load(raw)
    this.#parseItems()
  }

  #parseItems(): Array<ParsedListItem> {
    const tables = this.$('table')
    for (let i = 0; i < tables.length; i++) {
      const item = tables.eq(i)
      if (item.find('td').length === 3 && item.find('.even, .odd').length === 1) {
        const parsed = this.parseItem(item)
        if (parsed) {
          this.items.push(parsed)
        }
      }
    }
    return this.items
  }

  private parseItem(item: Cheerio<Element>): ParsedListItem | null {
    const url = item.find('a').attr('href')
    if (!url) {
      return null
    }

    // Get id from: /something/something/{id}-my-title
    const id = parseInt(url.split('/').pop()?.split('-').shift() ?? '')
    if (!id || isNaN(id)) {
      throw new Error(`Could not parse id from url: ${url}`)
    }

    return {
      id,
      url
    }
  }
}

class ProyectoDetailPage {
  private readonly $: CheerioAPI
  constructor(raw: string) {
    this.$ = load(raw)
  }

  public parse(): ProyectDetailPageData {
    return {
      numero: this.#getNumero(),
      numero_camara: this.#getNumeroCamara(),
      titulo: this.#getTitulo(),
      estado: this.#getEstado(),
      estado_anotacion: this.#getEstadoAnotacion(),
      comision: this.#getComision(),
      fecha_radicado: this.#getFechaPresentacion(),
      origen: this.#getOrigen(),
      tipo_ley: this.#getTipoLey(),
      fecha_envio_comision: this.#getFechaEnvioComision(),
      fechaPresentacion: this.#getFechaPresentacion(),
      fecha_aprobacion_primer_debate: this.#getFechaAprobacionPrimerDebate(),
      fecha_aprobacion_segundo_debate: this.#getFechaAprobacionSegundoDebate(),
      fecha_conciliacion: this.#getFechaConciliacion(),
      autores: this.#getAutores(),
      ...this.#parsePublicacionesTable()
    }
  }

  #getTituloNumeroTable() {
    return this.$('table').eq(0)
  }

  #getTitulo() {
    return cleanupTitle(this.#getTituloNumeroTable().find('big').text())
  }

  #getNumero() {
    const table = this.#getTituloNumeroTable()
    const raw = table
      .find("p:contains('Senado:')")
      .text()
      .trim()
      .replace(/C[aá]mara:.*/, '')
    const parsed = parseNumeroIdentificador(raw)
    return `${parsed.numero}/${parsed.year}`
  }

  #getNumeroCamara() {
    const table = this.#getTituloNumeroTable()
    const raw = table
      .find("p:contains('Camara:'), p:contains('Cámara')")
      .text()
      .trim()
      .replace(/Senado:.*/, '')
    try {
      const parsed = parseNumeroIdentificador(raw)
      return `${parsed.numero}/${parsed.year}`
    } catch (error) {
      return null
    }
  }

  #getTramiteTable() {
    return this.$('table').eq(1)
  }

  #getEstado() {
    return this.#getTramiteTable().find("tr:contains('Estado:')").find('td').eq(1).text().trim()
  }

  #getEstadoAnotacion() {
    return this.#getTramiteTable().find("tr:contains('Estado:')").find('td').eq(2).text().trim()
  }

  #getComision() {
    let comision = this.#getTramiteTable()
      .find("tr:contains('Repartido a Comisión:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
    if (comision === '-') {
      comision = 'NO ASIGNADA'
    }
    return comision
  }

  #getFechaPresentacion() {
    const raw = this.#getTramiteTable()
      .find("tr:contains('Fecha de Presentación:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
    return parseTextualDate(raw)
  }

  #getOrigen() {
    return this.#getTramiteTable().find("tr:contains('Origen:')").find('td').eq(1).text().trim()
  }

  #getTipoLey() {
    return this.#getTramiteTable()
      .find("tr:contains('Tipo de Ley:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
  }

  #getFechaEnvioComision() {
    const raw = this.#getTramiteTable()
      .find("tr:contains('Fecha de Envio a Comisión:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getFechaAprobacionPrimerDebate() {
    const raw = this.#getTramiteTable()
      .find("tr:contains('Fecha de Aprobación Primer Debate:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getFechaAprobacionSegundoDebate() {
    const raw = this.#getTramiteTable()
      .find("tr:contains('Fecha de Aprobación Segundo Debate:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getFechaConciliacion() {
    const raw = this.#getTramiteTable()
      .find("tr:contains('Fecha de Conciliación:')")
      .find('td')
      .eq(1)
      .text()
      .trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getAutores() {
    const raw = this.#getTramiteTable().find("tr:contains('Autor:')").find('td').eq(1).text().trim()
    return parseListOfNames(raw)
  }

  #getPublicacionesTable() {
    return this.$('table').eq(2)
  }

  #parsePublicacionesTable() {
    const rows = this.#getPublicacionesTable().find('tr')

    function rowExtractor(row: Cheerio<Element>, $: CheerioAPI): Array<string | null> {
      return row
        .find('td')
        .toArray()
        .map((td) => $(td).find('a').first().attr('href') ?? '')
        .map((href) => (href !== '/proyectos/' ? href : null))
    }

    const [exposicion_motivos, primera_ponencia, segunda_ponencia] = rowExtractor(rows.eq(1), this.$)
    if (
      exposicion_motivos === undefined ||
      primera_ponencia === undefined ||
      segunda_ponencia === undefined
    ) {
      throw new Error('No se pudo hacer parse correcto de las publicaciones: ')
    }

    const [texto_plenaria, conciliacion, objeciones] = rowExtractor(rows.eq(3), this.$)
    if (texto_plenaria === undefined || conciliacion === undefined || objeciones === undefined) {
      throw new Error('No se pudo hacer parse correcto de las publicaciones: ')
    }

    const [concepto, texto_rehecho, sentencia_corte] = rowExtractor(rows.eq(5), this.$)
    if (concepto === undefined || texto_rehecho === undefined || sentencia_corte === undefined) {
      throw new Error('No se pudo hacer parse correcto de las publicaciones: ')
    }

    return {
      exposicion_motivos,
      primera_ponencia,
      segunda_ponencia,
      texto_plenaria,
      conciliacion,
      objeciones,
      concepto,
      texto_rehecho,
      sentencia_corte
    }
  }
}

//async function run() {
//  const response = await fetch('http://leyes.senado.gov.co/proyectos/index.php/proyectos-ley/cuatrenio-2022-2026/2023-2024/article/273');
//  if (!response.ok) {
//    throw new Error('Could not fetch the page')
//  }
//  const html = await response.text()
//  const page = new ProyectoDetailPage(html)
//  logger.info(page.parse())
//}
//
//run();
