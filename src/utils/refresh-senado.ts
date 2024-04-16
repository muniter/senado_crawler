import { SenadoService } from '../senado/senado/index'
import { z } from 'zod'
import { Command } from 'commander'
const program = new Command()
program.description('Refreshes the data from the senado')
program.requiredOption('--cuatrenio <string>', 'Cuatrenio to refresh')
program.option('--legislatura <string>', 'Legislatura to refresh')
program.option('--tipo <string>', 'detalle | lista | full')
program.action(main)

async function main(options: any) {
    const { cuatrenio, legislatura, tipo } = z
        .object({ cuatrenio: z.string(), legislatura: z.string().optional(), tipo: z.enum(['detalle', 'lista', 'full']).default('full') })
        .parse(options)
    const senadoService = new SenadoService()
    if (tipo === 'full') {
        if (legislatura) {
            return await senadoService.refreshLegislatura(cuatrenio, legislatura)
        } else {
            return await senadoService.refreshCuatrenio(cuatrenio)
        }
    } else if (tipo === 'lista') {
        if (!legislatura) {
            throw new Error('Legislatura is required')
        }
        await senadoService.refreshProyectos(cuatrenio, legislatura)
    } else if (tipo === 'detalle') {
        if (!legislatura) {
            throw new Error('Legislatura is required')
        }
        await senadoService.refreshProyectoDetalles(legislatura)
    } else {
        throw new Error(`Invalid tipo: ${tipo}`)
    }
}

program.parse(process.argv)
