import { z } from 'zod'
import { Command } from 'commander'
import { PalService } from '../senado/pal'
const program = new Command()
program.description('Refreshes the data from the senado')
program.requiredOption('--cuatrenio <string>', 'Cuatrenio to refresh')
program.option('--legislatura <string>', 'Legislatura to refresh')
program.action(main)

async function main(options: any) {
  const { cuatrenio, legislatura, tipo } = z
    .object({ cuatrenio: z.string(), legislatura: z.string().optional(), tipo: z.enum(['detalle', 'lista', 'full']).default('full') })
    .parse(options)
  const service = new PalService()
  if (tipo === 'full') {
    if (legislatura) {
      return await service.refresh(cuatrenio, legislatura)
    } else {
      return await service.refreshCuatrenio(cuatrenio)
    }
  }
}

program.parse(process.argv)

