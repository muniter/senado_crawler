import { db, DBTransaction } from '../database'
import { NumeroIdentificador, ProyectoBasicData } from './crawler/list-processor'
import { getLegislaturaProyectsBasicData, getProyectoDetails } from './crawler/senado'
import { ProyectoDetailData } from './crawler/detail-processor'
import * as R from 'remeda';

export function formatNumeroLegislativo(numero: NumeroIdentificador) {
    return `${numero.numero}/${numero.year}`
}
// This is the class to call for the lifecycle of the information
export class SenadoService {
    constructor(private senadoRepository: SenadoRepository = new SenadoRepository()) { }

    async refreshCuatrenio(cuatrenio: string) {
        const legislaturas = await this.senadoRepository.getLegislaturasCuatrenio(cuatrenio)
        for (const legis of legislaturas) {
            await this.refreshLegislatura(cuatrenio, legis.title)
        }
    }

    async refreshLegislatura(cuatrenio: string, legislatura: string) {
        await this.refreshProyectos(cuatrenio, legislatura)
        await this.refreshProyectoDetalles(legislatura)
    }

    async refreshProyectos(cuatrenio: string, legislatura: string) {
        // Asserts they exist
        const exists = await this.senadoRepository.getLegislatura(cuatrenio, legislatura)
        if (exists === null) {
            throw new Error(`Legislatura ${cuatrenio} does not exist`)
        }
        const data = await getLegislaturaProyectsBasicData(cuatrenio, legislatura)
        console.log(
            `Parsed proyects ${data.length} data from cuatrenio ${cuatrenio} and legislatura ${legislatura}`
        )
        await this.senadoRepository.upsertProyectosFromBasicData(legislatura, data)
    }

    async refreshProyectoDetalles(legislatura: string) {
        const proyectos = await this.senadoRepository.getProyectosLegislatura(legislatura)
        const chunks = R.chunk(proyectos, 5)
        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (proyecto) => {
                const detalle = await getProyectoDetails(proyecto);
                if (!detalle) {
                    console.error(`Skipping proyecto: ${proyecto.numero}, no detail datata was found`)
                    return null
                }
                console.log(`Updating proyecto: ${proyecto.numero}, with id: ${proyecto.id}`)
                await db.transaction().execute(async (tx) => {
                    await this.senadoRepository.upsertProyectoDetalles(tx, proyecto.id, detalle)
                })
            }))
        }
    }
}

class SenadoRepository {
    constructor(
        private comisionRepository: ComisionRepository = new ComisionRepository(),
        private autorRepository: AutorRepository = new AutorRepository()
    ) { }

    async upsertProyectosFromBasicData(legislatura: string, proyecto: ProyectoBasicData[]) {
        await this.comisionRepository.upsertComisiones([
            ...new Set(proyecto.map((p) => p.comision)).values()
        ])
        await db.transaction().execute(async (tx) => {
            for (const p of proyecto) {
                await this.upsertProyectFromBasicData(tx, legislatura, p)
            }
        })
    }

    private async upsertProyectFromBasicData(
        tx: DBTransaction,
        legislatura: string,
        data: ProyectoBasicData
    ) {
        const numeroSenado = formatNumeroLegislativo(data.numeroSenado)
        const numeroCamara = data.numeroCamara ? formatNumeroLegislativo(data.numeroCamara) : null
        const update = {
            comisionId: tx.selectFrom('Comision').select('id').where('nombre', '=', data.comision),
            estado: data.estado.estado,
            estadoAnotacion: data.estado.anotacion,
            numero: numeroSenado,
            numeroCamara,
            titulo: data.titulo,
            fechaRadicado: data.fechaRadicado.toISOString(),
            legislaturaId: tx.selectFrom('Legislatura').select('id').where('title', '=', legislatura),
            url: data.url
        }
        // TODO: Replace with ON CONFLICT DO REPLACE
        // https://www.sqlite.org/lang_conflict.html
        const { id: proyectoId } = await tx
            .insertInto('ProyectoSenado')
            .values(update)
            .returning('id')
            .onConflict((oc) => oc.doUpdateSet(update))
            .executeTakeFirstOrThrow()

        await this.createRelacionados(tx, proyectoId, data.proyectosAcumulados)
        await this.autorRepository.syncAutoresWithProyecto(tx, proyectoId, data.autores)
        return proyectoId
    }

    async upsertProyectoDetalles(tx: DBTransaction, proyectoId: number, detalles: ProyectoDetailData) {
        await tx.replaceInto('ProyectoSenadoDetalles')
            .values({
                proyectoId,
                origen: detalles.origen,
                tipoLey: detalles.tipoLey,
                fechaEnvioComision: detalles.fechaEnvioComision?.toISOString(),
                fechaPresentacion: detalles.fechaPresentacion?.toISOString(),
                fechaAprobacionPrimerDebate: detalles.fechaAprobacionPrimerDebate?.toISOString(),
                fechaAprobacionSegundoDebate: detalles.fechaAprobacionSegundoDebate?.toISOString(),
                fechaConciliacion: detalles.fechaConciliacion?.toISOString()
            }).execute()

        await tx.replaceInto('ProyectoSenadoPublicaciones')
            .values({
                proyectoId,
                exposicionMotivos: detalles.publicaciones.exposicionMotivos,
                primeraPonencia: detalles.publicaciones.primeraPonencia,
                segundaPonencia: detalles.publicaciones.segundaPonencia,
                textoPlenaria: detalles.publicaciones.textoPlenaria,
                conciliacion: detalles.publicaciones.conciliacion,
                objeciones: detalles.publicaciones.objeciones,
                concepto: detalles.publicaciones.concepto,
                textoRehecho: detalles.publicaciones.textoRehecho,
                sentenciaCorte: detalles.publicaciones.sentenciaCorte,
            }).execute()


        // await tx.deleteFrom('ponenteProyecto')
        //   .where('proyectoId', '=', proyectoId)
        //   .execute()
        //
        // if (detalles.ponentes.length) {
        //   await tx.insertInto('ponente')
        //     .values(detalles.ponentes.map((p) => ({ nombre: p.ponente })))
        //     .onConflict((oc) => oc.doNothing())
        //     .execute()
        //
        //   await tx.insertInto('ponenteProyecto')
        //     .values(detalles.ponentes.map((p) => ({
        //       proyectoId,
        //       ponenteId: tx.selectFrom('ponente').select('id').where('nombre', '=', p.ponente),
        //       debate: p.debate,
        //     })))
        //     .execute()
        // }
    }

    async getProyectosLegislatura(legislatura: string) {
        return db
            .selectFrom('ProyectoSenado')
            .select(['ProyectoSenado.id', 'ProyectoSenado.url', 'ProyectoSenado.numero'])
            .leftJoin('Legislatura', 'Legislatura.id', 'ProyectoSenado.legislaturaId')
            .where('Legislatura.title', '=', legislatura)
            .execute()
    }

    private async createRelacionados(
        db: DBTransaction,
        proyectoId: number,
        relacionados: NumeroIdentificador[]
    ) {
        if (relacionados.length === 0) {
            return
        }
        await db
            .replaceInto('ProyectosRelacionados')
            .values(
                relacionados.map((r) => ({
                    proyectoId,
                    relacionadoNumero: formatNumeroLegislativo(r)
                }))
            )
            .execute()
    }

    private buildGetLegislaturas() {
        return db
            .selectFrom('Legislatura')
            .select(['Legislatura.id', 'Legislatura.title', 'Legislatura.cuatrenioId', 'Legislatura.inicio', 'Legislatura.fin'])
            .leftJoin('Cuatrenio', 'Cuatrenio.id', 'Legislatura.cuatrenioId')
    }

    async getLegislatura(cuatrenio: string, legislatura: string) {
        return this.buildGetLegislaturas()
            .where('Cuatrenio.title', '=', cuatrenio)
            .where('Legislatura.title', '=', legislatura)
            .executeTakeFirst()
    }

    async getLegislaturasCuatrenio(cuatrenio: string) {
        return this.buildGetLegislaturas()
            .where('Cuatrenio.title', '=', cuatrenio)
            .execute()
    }
}

class ComisionRepository {
    constructor() { }

    async upsertComisiones(comisiones: string[]) {
        await db
            .insertInto('Comision')
            .values(comisiones.map((c) => ({ nombre: c })))
            .onConflict((co) => co.doNothing())
            .execute()
    }
}

class AutorRepository {
    constructor() { }

    async syncAutoresWithProyecto(db: DBTransaction, proyectoId: number, autores: string[]) {
        if (autores.length > 0) {
            await db
                .insertInto('Autor')
                .values(autores.map((a) => ({ nombre: a })))
                .onConflict((co) => co.doNothing())
                .execute()

            const autoresId = await db
                .selectFrom('Autor')
                .select('id')
                .where('nombre', 'in', autores)
                .execute()

            await db.deleteFrom('AutorProyectos').where('proyectoId', '=', proyectoId).execute()

            await db
                .insertInto('AutorProyectos')
                .columns(['proyectoId', 'autorId'])
                .values(autoresId.map((a) => ({ proyectoId, autorId: a.id })))
                .execute()
        } else {
            console.log(`No autores, ${proyectoId}`)
        }
    }
}


export class CuatrenioRepository {
    constructor() { }

    private selectFields = ['id', 'title', 'inicio', 'fin'] as const

    async getAll() {
        return db.selectFrom('Cuatrenio').select(this.selectFields).execute()
    }

    async getByTitle(title: string) {
      return db.selectFrom('Cuatrenio').select(this.selectFields).where('title', '=', title).executeTakeFirst()
    }
}
