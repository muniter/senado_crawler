import { Cheerio, load } from 'cheerio';

export type ListData = {
  numeroCamara: string
  numeroSenado: string
  tituloCorto: string
  url: string
  tipo: string
  autores: string
  estado: string
  comision: string
  origen: 'Camara' | 'Senado'
  legislatura: string
}

export function processPage(raw: string) {
  const $ = load(raw)
  const rows = $('tbody tr').toArray()
  const data = rows.map((row) => {
    const columns = $(row).find('td').toArray()
    const numeroCamara = $(columns[0]).text().trim()
    const numeroSenado = $(columns[1]).text().trim()
    const tituloCorto = $(columns[2]).text().trim()
    const url = $(columns[2]).find('a').attr('href') ?? ''
    const tipo = $(columns[3]).text().trim()
    const autores = $(columns[4]).text().trim()
    const estado = $(columns[5]).text().trim()
    const comision = $(columns[6]).text().trim()
    const origen = $(columns[7]).text().trim()
    const legislatura = $(columns[8]).text().trim()

    const data: ListData = {
      numeroCamara,
      numeroSenado,
      tituloCorto,
      url,
      tipo,
      autores,
      estado,
      comision,
      origen: origen as 'Camara' | 'Senado',
      legislatura
    }
    return data
  })
}


