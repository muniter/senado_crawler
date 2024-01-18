import { refreshCuatrenio, refreshLegislaturaProyectosListData, refreshLegislaturaProyectosDetailData } from '../camara/index'
import { z } from 'zod'
import { Command } from 'commander'
const program = new Command()
program.description('Refreshes the data from the senado')
program.option('--cuatrenio <string>', 'Cuatrenio to refresh')
program.option('--legislatura <string>', 'Legislatura to refresh')
program.option('--tipo <string>', 'detalle | lista | full')
program.action(main)

async function main(options: any) {
  const { cuatrenio, legislatura, tipo } = z
    .object({ cuatrenio: z.string().optional(), legislatura: z.string().optional(), tipo: z.enum(['detalle', 'lista', 'full']).default('full') })
    .parse(options)
  if (cuatrenio) {
    await refreshCuatrenio(cuatrenio)
  }
  else if (tipo === 'lista') {
    if (!legislatura) {
      throw new Error('Legislatura is required')
    }
    await refreshLegislaturaProyectosListData(legislatura)
  } else if (tipo === 'detalle') {
    if (!legislatura) {
      throw new Error('Legislatura is required')
    }
    await refreshLegislaturaProyectosDetailData(legislatura)
  } else {
    throw new Error(`Invalid tipo: ${tipo}`)
  }
}

program.parse(process.argv)

