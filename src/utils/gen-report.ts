import { z } from 'zod'
import fs from 'fs'
import child_process from 'child_process'
import { Command } from 'commander'
import { CuatrenioRepository } from '../common/repositories';
import { logger } from './logger'
const program = new Command()
program.description('Refreshes the data from the database')
program.requiredOption('--corporacion <string>', 'Camara | Senado')
program.option('--tipo <string>', 'json | csv | all')
program.option('--cuatrenio <string>', 'Cuatrenio to generate report of')
program.action(generateReport)

const queryFiles: Record<string, string> = {
  senado: 'senado_query.sql',
  camara: 'camara_query.sql',
  pal: 'senado_pal_query.sql',
}

const schema = z.object({
  cuatrenio: z.string().optional(),
  tipo: z.enum(['json', 'csv', 'all']).default('all'),
  corporacion: z.enum(['camara', 'senado', 'PAL'])
})

export type Options = z.infer<typeof schema>

export async function generateReport(options: Options) {
  const { cuatrenio, tipo, corporacion } = z.object({
    corporacion: z.enum(['camara', 'senado', 'PAL']),
    cuatrenio: z.string().optional(),
    tipo: z.enum(['json', 'csv', 'all']).default('all')
  }).parse(options)

  let cuaternios: string[] = []
  const cuatrenioRepository = new CuatrenioRepository()
  if (cuatrenio) {
    const exists = await cuatrenioRepository.getByTitle(cuatrenio) !== undefined;
    if (!exists) {
      logger.error(`Cuatrenio ${cuatrenio} does not exist`)
      process.exit(1)
    }
    cuaternios = [cuatrenio]
  } else {
    const all = await cuatrenioRepository.getAll()
    cuaternios = all.map(c => c.title)
  }

  for (const cuatrenio of cuaternios) {
    const templateQueryFile = queryFiles[corporacion.toLowerCase()]
    if (!templateQueryFile) {
      throw new Error(`No query file found for corporacion ${corporacion}`)
    }
    const queryFile = renderQueryFile(cuatrenio, templateQueryFile)
    if (tipo === 'json' || tipo === 'all') {
      logger.info(`Generating JSON for ${cuatrenio}`)
      genJSON(cuatrenio, queryFile, corporacion)
      logger.info(`Generated JSON for ${cuatrenio}`)
    }
    if (tipo === 'csv' || tipo === 'all') {
      logger.info(`Generating CSV for ${cuatrenio}`)
      genCSV(cuatrenio, queryFile, corporacion)
      logger.info(`Generated CSV for ${cuatrenio}`)
    }
  }
}

function renderQueryFile(cuatrenio: string, queryFile: string): string {
  // Prepare query file
  let query = fs.readFileSync(`db/${queryFile}`, 'utf-8')
  query = query.replaceAll(':cuatrenio_title', `'${cuatrenio}'`)
  const tmp = fs.mkdtempSync('/tmp/')
  const tmpFile = `${tmp}/report_query.sql`
  fs.writeFileSync(tmpFile, query)
  logger.info(`Query file prepared at ${tmpFile}`)
  return tmpFile
}


function genCSV(cuatrenio: string, queryFile: string, corporacion: string) {
  const title = `data_${corporacion.toLowerCase()}_${cuatrenio}.csv`.replace('senado_', '');
  const command = `sqlite3 db/database.db -cmd '.mode csv' -cmd '.headers on'  < ${queryFile} > output/${title}`
  child_process.execSync(command)
}

function genJSON(cuatrenio: string, queryFile: string, corporacion: string) {
  const title = `data_${corporacion.toLowerCase()}_${cuatrenio}.json`.replace('senado_', '');
  const json_fields = ['.autores']
  if (corporacion === 'PAL') {
    json_fields.push('.acumulados')
    json_fields.push('.ponentesPrimerDebate')
  }
  const command = `sqlite3 db/database.db -cmd '.mode json' -cmd '.headers on'  < ${queryFile} | jq 'map((${json_fields.join(', ')}) |= fromjson)' > output/${title}`
  logger.info(`Executing command: ${command}`)
  child_process.execSync(command)
}

if (require.main === module) {
  program.parse(process.argv)
}
