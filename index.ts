import { GoogleSpreadsheet } from "google-spreadsheet";
import * as Credentials from "./credentials.json"
import Axios from 'axios'
import * as cheerio from "cheerio";

const documentId = '1W20fS5bUYOK5jc9cBLG1-fa823X-N9EaQkV2LaExk_0'
const sheet = 'db'
const URLS = {
  'list': 'http://leyes.senado.gov.co/proyectos/index.php/proyectos-ley/cuatrenio-2018-2022/2020-2021?option=com_joodb&view=catalog&format=html&reset=false&ordering=&orderby=&Itemid=478&task=&search=&searchfield=&limit=0'
} as const
const columns = ['COMISION', 'ESTADO', 'TITULO', 'FECHA DE RADICACIÓN', 'SENADO', 'CAMARA', 'AUTOR'] as const

async function setupDoc() {
  const doc = new GoogleSpreadsheet(documentId);
  await doc.useServiceAccountAuth({
    client_email: Credentials.client_email,
    private_key: Credentials.private_key,
  });
  await doc.loadInfo();
  return doc;
}

type Row = {
  comision: string
  nombre: string
  titulo: string
}

async function getLastData() {
  // Get the url data
  const response = await Axios.get(URLS.list)
  const data = response.data
  if (typeof data !== 'string') {
    throw new Error('Data is not a string')
  }
  const $ = cheerio.load(data)
  const tables = $('table')
  const results: Row[] = []
  console.log("Table length: ", tables.length)
  tables.map((_i, table) => {
    const row: string[] = []
    // Iterate over the td
    const tds = $(table).find('td')
    tds.map((_i, td) => {
      const text = $(td).text()
      row.push(text)
    })
    const [comision, nombre, titulo] = row
    if (comision && nombre && titulo) {
      results.push({ comision, nombre, titulo })
    } 
  })
  return results
}

async function main() {
  const doc = await setupDoc();
  const res = await getLastData()
  const sheet = doc.sheetsByIndex[0];
  await sheet.clear()
  await sheet.setHeaderRow(['comision', 'nombre', 'titulo'])
  await sheet.addRows(res)
}

main();
