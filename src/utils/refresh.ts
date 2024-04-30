import { z } from 'zod'
import { Command } from 'commander'
import { SenadoService } from '../senado/senado/index.js'
import { generateReport } from './gen-report.js'
import { logger } from './logger.js'
import { PalService } from '../senado/pal/index.js'
import { refreshCuatrenio, refreshLegislaturaProyectosListData, refreshLegislaturaProyectosDetailData } from '../camara/index.js';

const program = new Command()
program.description('Refreshes the data from the senado')
program.requiredOption('--cuatrenio <string>', 'Cuatrenio to refresh')
program.requiredOption('--tipo <string>', 'Tipo (senado, camara, PAL)')
program.option('--legislatura <string>', 'Legislatura to refresh')
program.option('--report', 'Generate report')
program.action(main)

const schema = z.object({
  cuatrenio: z.string(),
  legislatura: z.string().optional(),
  tipo: z.enum(['senado', 'camara', 'PAL']),
  report: z.boolean().default(false),
})

type Options = z.infer<typeof schema>

async function main(raw_options: any) {
  const options = schema.parse(raw_options)
  switch (options.tipo) {
    case 'PAL':
      await palRefresh(options)
      break;
    case 'senado':
      await senadoRefresh(options)
      break;
    case 'camara':
      await camaraRefresh(options)
      break;
    default:
      throw new Error(`Invalid tipo: ${options.tipo}`)
  }

  if (options.report) {
    logger.info('Generating report')
    await generateReport({ cuatrenio: options.cuatrenio, tipo: 'all', corporacion: options.tipo })
  }
}

async function palRefresh(options: Options) {
  const service = new PalService()
  if (options.legislatura) {
    return service.refreshLegislatura(options.cuatrenio, options.legislatura)
  } else {
    return service.refreshCuatrenio(options.cuatrenio)
  }
}

program.parse(process.argv)


async function camaraRefresh(options: Options) {
  if (options.legislatura) {
    await refreshLegislaturaProyectosListData(options.legislatura)
    await refreshLegislaturaProyectosDetailData(options.legislatura)
  } else {
    await refreshCuatrenio(options.cuatrenio)
  }
}

async function senadoRefresh(options: Options) {
  const service = new SenadoService()
  if (options.legislatura) {
    return service.refreshLegislatura(options.cuatrenio, options.legislatura)
  } else {
    return service.refreshCuatrenio(options.cuatrenio)
  }
}

