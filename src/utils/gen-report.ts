import { z } from 'zod'
import fs from 'fs'
import child_process from 'child_process'
import { Command } from 'commander'
import { CuatrenioRepository } from '../senado'
const program = new Command()
program.description('Refreshes the data from the senado')
program.option('--type <string>', 'json | csv | all')
program.option('--cuatrenio <string>', 'Cuatrenio to generate report of')
program.action(main)

async function main(options: any) {
  const { cuatrenio, tipo } = z.object({
    cuatrenio: z.string().optional(),
    tipo: z.enum(['json', 'csv', 'all']).default('all')
  }).parse(options)

  let cuaternios: string[] = []
  const cuatRep = new CuatrenioRepository()
  if (cuatrenio) {
    const exists = await cuatRep.getByTitle(cuatrenio) !== undefined;
    if (!exists) {
      console.error(`Cuatrenio ${cuatrenio} does not exist`)
      process.exit(1)
    }
    cuaternios = [cuatrenio]
  } else {
    const all = await cuatRep.getAll()
    cuaternios = all.map(c => c.title)
  }

  for (const cuatrenio of cuaternios) {
    const queryFile = prepareQueryFile(cuatrenio)
    if (tipo === 'json' || tipo === 'all') {
      console.log(`Generating JSON for ${cuatrenio}`)
      genJSON(cuatrenio, queryFile)
      console.log(`Generated JSON for ${cuatrenio}`)
    }
    if (tipo === 'csv' || tipo === 'all') {
      console.log(`Generating CSV for ${cuatrenio}`)
      genCSV(cuatrenio, queryFile)
      console.log(`Generated CSV for ${cuatrenio}`)
    }
  }
}

function prepareQueryFile(cuatrenio: string): string {
  // Prepare query file
  let query = fs.readFileSync('db/report_query.sql', 'utf-8')
  query = query.replace(':cuatrenio_title', `'${cuatrenio}'`)
  const tmp = fs.mkdtempSync('tmp')
  const tmpFile = `${tmp}/report_query.sql`
  fs.writeFileSync(tmpFile, query)
  console.log(`Query file prepared at ${tmpFile}`)
  return tmpFile
}


function genCSV(cuatrenio: string, queryFile: string) {
  const command = `sqlite3 db/database.db -cmd '.mode csv' -cmd '.headers on'  < ${queryFile} > output/data_${cuatrenio}.csv`
  child_process.execSync(command)
}

function genJSON(cuatrenio: string, queryFile: string) {
  const command = `sqlite3 db/database.db -cmd '.mode json' -cmd '.headers on'  < ${queryFile} | jq 'map((.autores) |= fromjson)' > output/data_${cuatrenio}.json`
  child_process.execSync(command)
}

program.parse(process.argv)
