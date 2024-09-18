import { type Cheerio, type CheerioAPI, type Element, load } from 'cheerio'
import {
  getNumeroSenado,
  parseTextualDate,
  parseListOfNames,
  cleanupTitle,
  type NumeroIdentificador
} from '../../common/utils.js'
import { Axios } from 'axios'
import assert from 'assert'
import { logger } from '../../utils/logger.js'
import PQueue from 'p-queue'

type ParsedListItem = {
  id: number
  url: string
}

type ParsedDetailData = {
  titulo: string
  fechaDePresentacion: Date | undefined
  numero: string
  numeroCamara?: string
  acumulados: string[]
  estado: string
  estadoAnotacion: string | null
  autores: string[]
  origen: string
  ponentesPrimerDebate: string[]
}

export type DetailData = ParsedDetailData & {
  id_senado: number
  legislatura: string
  url: string
}

export class Extractor {
  private axios: Axios
  private urlConfig = {
    baseURL: 'http://leyes.senado.gov.co',
    head: '/proyectos/index.php/proyectos-de-acto-legislativo',
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

    const queue = new PQueue({ concurrency: 10 })
    queue.on(
      'completed',
      () => results.length % 10 === 0 && logger.info(`Processed ${results.length} items`)
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
      const detail = new ProyectoPalDetailPage(data).data
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

// Parse, and extract the rows, producing row objects
class ProyectoPaListPage {
  private $: CheerioAPI
  public items: ParsedListItem[] = []

  constructor(raw: string) {
    this.$ = load(raw)
    const tables = this.$('table')
    for (let i = 0; i < tables.length; i++) {
      const item = tables.eq(i)
      if (item.find('td').length === 3 && item.find('.even, .odd').length === 1) {
        let parsed = this.parseItem(item)
        if (parsed) {
          this.items.push(parsed)
        }
      }
    }
  }

  private parseItem(item: Cheerio<Element>) {
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

class ProyectoPalDetailPage {
  private $: CheerioAPI
  data: ParsedDetailData

  constructor(raw: string) {
    this.$ = load(raw)
    this.data = this.parseData()
  }

  private parseData(): ParsedDetailData {
    const numero = this.parseNumeroSenado()

    const result = {
      titulo: this.parseTitulo(),
      fechaDePresentacion: this.parseFechaPresentacion(),
      numero: numero.numero,
      numeroCamara: this.parseNumeroCamara(),
      acumulados: numero.acumulados,
      ...this.parseEstado(),
      autores: this.parseAutores(),
      origen: this.parseOrigen(),
      ponentesPrimerDebate: this.parsePonentesPrimerDebate()
    }

    return result
  }

  private getNumeroSenadoCamaraYTituloDD() {
    return this.$('dd')
  }

  private parseNumeroSenado() {
    const dd = this.getNumeroSenadoCamaraYTituloDD()
    assert(dd.length)

    // Element with text content 'Senado';
    const senadoP = dd.find('p:contains("Senado")')
    assert(senadoP.length)

    const text = senadoP
      .text()
      .replace(/Cámara:.*/, '')
      .trim()
    const result = getNumeroSenado(text)

    function numeroToString(numero: NumeroIdentificador) {
      return `${String(numero.numero).padStart(3, '0')}/${numero.year}PAL`
    }

    return {
      numero: numeroToString(result.numero),
      acumulados: result.acumulados.map(numeroToString)
    }
  }

  private parseNumeroCamara() {
    const dd = this.getNumeroSenadoCamaraYTituloDD()
    assert(dd.length)
    // Element with text content 'Cámara';
    const camaraP = dd.find('p:contains("Cámara")')
    assert(camaraP.length)
    const result = camaraP.text().match(/Cámara: (?<numero>\d+\/\d+)/)
    return result?.groups?.numero
  }

  private parseTitulo() {
    const dd = this.getNumeroSenadoCamaraYTituloDD()
    const titulo = dd.find('big').text()
    return cleanupTitle(titulo)
  }

  private getEstadoAutorOrigenFechaTable() {
    return this.$('table:contains("Estado del Proyecto:")')
  }

  private parseEstado() {
    const table = this.getEstadoAutorOrigenFechaTable()
    const data = table.find('tr:nth-child(1)').find('td:nth-child(2)').text().trim()
    const [estado, estadoAnotacion] = data.split(',').map((s) => s.trim())
    assert(estado, 'Estado is empty')
    return {
      estado,
      estadoAnotacion: estadoAnotacion ?? null
    }
  }

  private parseAutores() {
    const table = this.getEstadoAutorOrigenFechaTable()
    const data = table.find('tr:nth-child(2)').find('td:nth-child(2)').text().trim()
    return parseListOfNames(data)
  }

  parseOrigen(): string {
    const table = this.getEstadoAutorOrigenFechaTable()
    return table.find('tr:nth-child(3)').find('td:nth-child(2)').text().trim()
  }

  private parseFechaPresentacion(): Date | undefined {
    const table = this.getEstadoAutorOrigenFechaTable()
    const data = table.find('tr:nth-child(4)').find('td:nth-child(2)').text().trim()
    try {
      return parseTextualDate(data)
    } catch {
      return undefined
    }
  }

  private getTramiteEnSenadoPriemraVueltaTable() {
    return this.$('table:contains("TRAMITE EN SENADO DE LA REPUBLICA 1° VUELTA")')
  }

  private parsePonentesPrimerDebate() {
    const table = this.getTramiteEnSenadoPriemraVueltaTable()
    return parseListOfNames(table.find('tr:nth-child(2)').find('td:nth-child(2)').text().trim())
  }
}
