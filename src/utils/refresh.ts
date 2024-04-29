import { z } from 'zod'
import { Command } from 'commander'
import { PalService } from '../senado/pal'
import { SenadoService } from '../senado/senado'
const program = new Command()
program.description('Refreshes the data from the senado')
program.requiredOption('--cuatrenio <string>', 'Cuatrenio to refresh')
program.requiredOption('--tipo <string>', 'Tipo (senado, camara, PAL)')
program.option('--legislatura <string>', 'Legislatura to refresh')
program.action(main)

const schema = z.object({
  cuatrenio: z.string(),
  legislatura: z.string().optional(),
  tipo: z.enum(['senado', 'camara', 'PAL'])
})

type Options = z.infer<typeof schema>

async function main(raw_options: any) {
  const options = schema.parse(raw_options)
  switch (options.tipo) {
    case 'PAL':
      return await palRefresh(options)
    case 'senado':
      return await senadoRefresh(options)
    case 'camara':
      return await camaraRefresh(options)
    default:
      throw new Error(`Invalid tipo: ${options.tipo}`)
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
  const { refreshCuatrenio, refreshLegislaturaProyectosListData, refreshLegislaturaProyectosDetailData } = require('../camara/index');
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
    return service.refresh(options.cuatrenio, options.legislatura)
  } else {
    return service.refreshCuatrenio(options.cuatrenio)
  }
}

