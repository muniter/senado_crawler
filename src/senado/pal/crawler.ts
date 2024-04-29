import { Cheerio, CheerioAPI, Element, load } from "cheerio";
import { assert } from "console";
import { getNumeroSenado, parseTextualDate, parseListOfNames, cleanupTitle } from "../../common/utils";
import { NumeroIdentificador } from "../senado/list-processor";
import { Axios } from "axios";
import * as R from 'remeda';

type ParsedListItem = {
  id: number,
  url: string,
}

type ParsedDetailData = {
  titulo: string,
  fechaDePresentacion: Date | undefined,
  numero: string,
  numeroCamara?: string,
  acumulados: string[],
  estado: string,
  autores: string[],
  origen: string,
  ponentesPrimerDebate: string[],
}

export type DetailData = ParsedDetailData & {
  id_senado: number,
  legislatura: string,
  url: string,
}

export class Extractor {

  private axios: Axios;
  private urlConfig = {
    baseURL: 'http://leyes.senado.gov.co',
    head: '/proyectos/index.php/proyectos-de-acto-legislativo',
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

  async getHtml(url: string) {
    return this.axios.get(url);
  }

  private listDataUrl() {
    return `${this.urlConfig.head}/cuatrenio-${this.cuatrenio}/${this.legislatura}${this.urlConfig.query}`;
  }

  public async process(): Promise<DetailData[]> {
    const { data } = await this.getHtml(this.listDataUrl());
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid data');
    }
    const { items } = new ProyectoPaListPage(data);
    const results: DetailData[] = [];

    let counter = 0;
    const chunks = R.chunk(items, 10);
    for (const chunk of chunks) {
      console.debug(`Processing chunk ${counter++}`);
      await Promise.all(chunk.map(async item => {
        console.debug(`Processing item ${item.id}`);
        const { data } = await this.getHtml(item.url);
        if (!data || typeof data !== 'string') {
          throw new Error('Invalid data');
        }
        const url = `${this.urlConfig.baseURL}${item.url}`
        try {
          const detail = new ProyectoPalDetailPage(data).data;
          results.push({
            ...detail,
            id_senado: item.id,
            legislatura: this.legislatura,
            url,
          })
          console.debug(`Done processing item ${item.id}`);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          console.error(`Error processing item ${item.id}: ${message}\n Url: ${url}`);
        }
      })
      )
    }
    return results;
  }

}

// Parse, and extract the rows, producing row objects
class ProyectoPaListPage {
  private $: CheerioAPI
  public items: ParsedListItem[] = [];

  constructor(raw: string) {
    this.$ = load(raw);
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
  }

  private parseItem(item: Cheerio<Element>) {
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

class ProyectoPalDetailPage {
  private $: CheerioAPI;
  data: ParsedDetailData;


  constructor(raw: string) {
    this.$ = load(raw);
    this.data = this.parseData();
  }

  private parseData(): ParsedDetailData {
    const numero = this.parseNumeroSenado();

    const result = {
      titulo: this.parseTitulo(),
      fechaDePresentacion: this.parseFechaPresentacion(),
      numero: numero.numero,
      numeroCamara: this.parseNumeroCamara(),
      acumulados: numero.acumulados,
      estado: this.parseEstado(),
      autores: this.parseAutores(),
      origen: this.parseOrigen(),
      ponentesPrimerDebate: this.parsePonentesPrimerDebate(),
    }

    return result;
  }

  private getNumeroSenadoCamaraYTituloDD() {
    return this.$('dd');
  }

  private parseNumeroSenado() {
    const dd = this.getNumeroSenadoCamaraYTituloDD();
    assert(dd.length);

    // Element with text content 'Senado';
    const senadoP = dd.find('p:contains("Senado")');
    assert(senadoP.length);

    const text = senadoP.text().replace(/Cámara:.*/, '').trim();
    let result;
    try {
      result = getNumeroSenado(text);
    } catch {
      throw new Error(`Could not parse numero senado from: ${text}`);
    }


    function numeroToString(numero: NumeroIdentificador) {
      return `${String(numero.numero).padStart(3, '0')}/${numero.year}PAL`;
    }

    return {
      numero: numeroToString(result.numero),
      acumulados: result.acumulados.map(numeroToString),
    }
  }

  private parseNumeroCamara() {
    const dd = this.getNumeroSenadoCamaraYTituloDD();
    assert(dd.length);
    // Element with text content 'Cámara';
    const camaraP = dd.find('p:contains("Cámara")');
    assert(camaraP.length);
    const result = camaraP.text().match(/Cámara: (?<numero>\d+\/\d+)/);
    return result?.groups?.numero;
  }

  private parseTitulo() {
    const dd = this.getNumeroSenadoCamaraYTituloDD();
    const titulo = dd.find('big').text();
    return cleanupTitle(titulo);
  }

  private getEstadoAutorOrigenFechaTable() {
    return this.$('table:contains("Estado del Proyecto:")');
  }

  private parseEstado() {
    const table = this.getEstadoAutorOrigenFechaTable();
    const data = table.find('tr:nth-child(1)').find('td:nth-child(2)').text().trim();
    return data;
  }

  private parseAutores() {
    const table = this.getEstadoAutorOrigenFechaTable();
    const data = table.find('tr:nth-child(2)').find('td:nth-child(2)').text().trim();
    return parseListOfNames(data);
  }

  parseOrigen(): string {
    const table = this.getEstadoAutorOrigenFechaTable();
    return table.find('tr:nth-child(3)').find('td:nth-child(2)').text().trim();
  }

  private parseFechaPresentacion(): Date | undefined {
    const table = this.getEstadoAutorOrigenFechaTable();
    const data = table.find('tr:nth-child(4)').find('td:nth-child(2)').text().trim();
    try {
      return parseTextualDate(data);
    } catch {
      return undefined;
    }
  }

  private getTramiteEnSenadoPriemraVueltaTable() {
    return this.$('table:contains("TRAMITE EN SENADO DE LA REPUBLICA 1° VUELTA")');
  }

  private parsePonentesPrimerDebate() {
    const table = this.getTramiteEnSenadoPriemraVueltaTable();
    return parseListOfNames(table.find('tr:nth-child(2)').find('td:nth-child(2)').text().trim());
  }
}
