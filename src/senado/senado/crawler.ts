import { Cheerio, CheerioAPI, Element, load } from "cheerio"
import { cleanupTitle, parseListOfNames, parseNumeroIdentificador, parseTextualDate } from "../../common/utils"
import { NumeroIdentificador } from "../senado/list-processor"
import { Axios } from "axios"
import * as R from 'remeda';
import { logger } from "../../utils/logger";
import PQueue from "p-queue";

export interface ProyectDetailPageData {
  numero: string
  numeroCamara: string | null
  titulo: string
  estado: string
  estadoAnotacion: string
  comision: string
  fechaRadicado: Date
  origen: string
  tipoLey: string
  fechaEnvioComision: Date | null
  fechaPresentacion: Date
  fechaAprobacionPrimerDebate: Date | null
  fechaAprobacionSegundoDebate: Date | null
  fechaConciliacion: Date | null
  autores: string[]
  exposicionMotivos: string | null
  primeraPonencia: string | null
  segundaPonencia: string | null
  textoPlenaria: string | null
  conciliacion: string | null
  objeciones: string | null
  concepto: string | null
  textoRehecho: string | null
  sentenciaCorte: string | null
}

export type DetailData = ProyectDetailPageData & {
  id_senado: number
  legislatura: string
  url: string
}


export class Extractor {

  private axios: Axios;
  private urlConfig = {
    baseURL: 'http://leyes.senado.gov.co',
    head: '/proyectos/index.php/proyectos-ley',
    query:
      '?option=com_joodb&view=catalog&format=html&reset=false&task=&search=&searchfield=&limit=0'
  }

  constructor(
    private cuatrenio: string,
    private legislatura: string,
  ) {
    this.axios = new Axios({
      baseURL: this.urlConfig.baseURL,
      timeout: 10000,
    });
  }

  async getHtml(url: string, options: { retries: number } = { retries: 3 }) {
    const retries = options?.retries ?? 2;
    let attempt = 1;
    while (attempt <= retries) {
      try {
        const { data } = await this.axios.get(url);
        if (typeof data !== 'string') {
          throw new Error('Invalid data');
        }
        return data;
      } catch (e) {
        logger.error(`Error fetching ${url}`);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
  }

  private listDataUrl() {
    return `${this.urlConfig.head}/cuatrenio-${this.cuatrenio}/${this.legislatura}${this.urlConfig.query}`;
  }

  public async process(): Promise<DetailData[]> {
    const data = await this.getHtml(this.listDataUrl());
    const { items } = new ProyectoPaListPage(data);
    const results: DetailData[] = [];

    logger.info(`Processing ${items.length} items`);

    const queue = new PQueue({ concurrency: 10 });
    queue.on('completed', () => (results.length % 10 === 0) && logger.info(`Processed ${results.length}/${items.length}`));

    items.forEach(item => queue.add(async () => {
      await this.#processOne(item).then(data => data && results.push(data))
    }))
    await queue.onIdle();
    logger.info(`Queue completed with ${results.length} items`);

    return results;
  }

  async #processOne(item: ParsedListItem): Promise<DetailData | undefined> {
    logger.debug(`Processing item ${item.id}`);
    const data = await this.getHtml(item.url);
    const url = `${this.urlConfig.baseURL}${item.url}`
    try {
      const detail = new ProyectoDetailPage(data).parse();
      logger.debug(`Processed item ${item.id}`);
      return {
        ...detail,
        id_senado: item.id,
        legislatura: this.legislatura,
        url,
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      logger.error(`Error processing item ${item.id}: ${message}\n Url: ${url}`);
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
  public items: ParsedListItem[] = [];

  constructor(raw: string) {
    this.$ = load(raw);
    this.#parseItems();
  }

  #parseItems(): Array<ParsedListItem> {
    const tables = this.$('table');
    for (let i = 0; i < tables.length; i++) {
      const item = tables.eq(i);
      if (item.find('td').length === 3 && item.find('.even, .odd').length === 1) {
        let parsed = this.parseItem(item);
        if (parsed) {
          this.items.push(parsed);
        }
      }
    }
    return this.items;
  }

  private parseItem(item: Cheerio<Element>): ParsedListItem | null {
    const url = item.find('a').attr('href');
    if (!url) {
      return null;
    }

    // Get id from: /something/something/{id}-my-title
    const id = parseInt(url.split('/').pop()?.split('-').shift() ?? '');
    if (!id || isNaN(id)) {
      throw new Error(`Could not parse id from url: ${url}`);
    }

    return {
      id,
      url,
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
      numeroCamara: this.#getNumeroCamara(),
      titulo: this.#getTitulo(),
      estado: this.#getEstado(),
      estadoAnotacion: this.#getEstadoAnotacion(),
      comision: this.#getComision(),
      fechaRadicado: this.#getFechaPresentacion(),
      origen: this.#getOrigen(),
      tipoLey: this.#getTipoLey(),
      fechaEnvioComision: this.#getFechaEnvioComision(),
      fechaPresentacion: this.#getFechaPresentacion(),
      fechaAprobacionPrimerDebate: this.#getFechaAprobacionPrimerDebate(),
      fechaAprobacionSegundoDebate: this.#getFechaAprobacionSegundoDebate(),
      fechaConciliacion: this.#getFechaConciliacion(),
      autores: this.#getAutores(),
      ...this.#parsePublicacionesTable(),
    }
  }

  #getTituloNumeroTable() {
    return this.$('table').eq(0)
  }

  #getTitulo() {
    return cleanupTitle(this.#getTituloNumeroTable().find('big').text());
  }

  #getNumero() {
    const table = this.#getTituloNumeroTable()
    const raw = table.find("p:contains('Senado:')").text().trim().replace(/C[aá]mara:.*/, '')
    const parsed = parseNumeroIdentificador(raw)
    return `${parsed.numero}/${parsed.year}`
  }

  #getNumeroCamara() {
    const table = this.#getTituloNumeroTable()
    const raw = table.find("p:contains('Camara:'), p:contains('Cámara')").text().trim().replace(/Senado:.*/, '')
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
    let comision = this.#getTramiteTable().find("tr:contains('Repartido a Comisión:')").find('td').eq(1).text().trim()
    if (comision === '-') {
      comision = 'NO ASIGNADA'
    }
    return comision
  }

  #getFechaPresentacion() {
    const raw = this.#getTramiteTable().find("tr:contains('Fecha de Presentación:')").find('td').eq(1).text().trim()
    return parseTextualDate(raw)
  }

  #getOrigen() {
    return this.#getTramiteTable().find("tr:contains('Origen:')").find('td').eq(1).text().trim()
  }

  #getTipoLey() {
    return this.#getTramiteTable().find("tr:contains('Tipo de Ley:')").find('td').eq(1).text().trim()
  }

  #getFechaEnvioComision() {
    const raw = this.#getTramiteTable().find("tr:contains('Fecha de Envio a Comisión:')").find('td').eq(1).text().trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getFechaAprobacionPrimerDebate() {
    const raw = this.#getTramiteTable().find("tr:contains('Fecha de Aprobación Primer Debate:')").find('td').eq(1).text().trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getFechaAprobacionSegundoDebate() {
    const raw = this.#getTramiteTable().find("tr:contains('Fecha de Aprobación Segundo Debate:')").find('td').eq(1).text().trim()
    try {
      return parseTextualDate(raw)
    } catch (error) {
      return null
    }
  }

  #getFechaConciliacion() {
    const raw = this.#getTramiteTable().find("tr:contains('Fecha de Conciliación:')").find('td').eq(1).text().trim()
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
      return row.find('td')
        .toArray()
        .map((td) => $(td).find('a').first().attr('href') ?? '')
        .map((href) => href !== '/proyectos/' ? href : null)
    }

    const [exposicionMotivos, primeraPonencia, segundaPonencia] = rowExtractor(rows.eq(1), this.$)
    if (exposicionMotivos === undefined || primeraPonencia === undefined || segundaPonencia === undefined) {
      throw new Error('No se pudo hacer parse correcto de las publicaciones: ')
    }

    const [textoPlenaria, conciliacion, objeciones] = rowExtractor(rows.eq(3), this.$)
    if (textoPlenaria === undefined || conciliacion === undefined || objeciones === undefined) {
      throw new Error('No se pudo hacer parse correcto de las publicaciones: ')
    }

    const [concepto, textoRehecho, sentenciaCorte] = rowExtractor(rows.eq(5), this.$)
    if (concepto === undefined || textoRehecho === undefined || sentenciaCorte === undefined) {
      throw new Error('No se pudo hacer parse correcto de las publicaciones: ')
    }

    return {
      exposicionMotivos,
      primeraPonencia,
      segundaPonencia,
      textoPlenaria,
      conciliacion,
      objeciones,
      concepto,
      textoRehecho,
      sentenciaCorte,
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
