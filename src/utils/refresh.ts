import { SenadoService } from '../senado/index'
import { z } from 'zod'
import { Command } from 'commander'
const program = new Command()
program.description('Refreshes the data from the senado')
program.requiredOption('--cuatrenio <string>', 'Cuatrenio to refresh')
program.requiredOption('--legislatura <string>', 'Legislatura to refresh')
program.requiredOption('--tipo <string>', 'detalle | lista')
program.action(main)

async function main(options: any) {
  console.log(options)
  const { cuatrenio, legislatura, tipo } = z
    .object({ cuatrenio: z.string(), legislatura: z.string(), tipo: z.enum(['detalle', 'lista']) })
    .parse(options)
  const senadoService = new SenadoService()
  if (tipo === 'lista') {
    await senadoService.refreshProyectos(cuatrenio, legislatura)
  } else {
    await senadoService.refreshProyectoDetalles(legislatura)
  }
}

program.parse(process.argv)
