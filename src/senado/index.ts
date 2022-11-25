import { db, DBTransaction } from '../database'
import { NumeroIdentificador, ProyectoBasicData } from '../crawler/list-processor'
import { getLegislaturaProyectsBasicData, getProyectoDetails } from '../crawler/senado'
import { ProyectoDetailData } from '../crawler/detail-processor'

export function formatNumeroLegislativo(numero: NumeroIdentificador) {
  return `${numero.numero}/${numero.year}`
}
// This is the class to call for the lifecycle of the information
export class SenadoService {
  constructor(private senadoRepository: SenadoRepository = new SenadoRepository()) { }

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
    console.log(proyectos)
    console.log(`Getting proyect details for: ${proyectos.length} proyectos`)
    for (const proyecto of proyectos) {
      const detalle = await getProyectoDetails(proyecto);
      if (!detalle) {
        console.error(`Skipping proyecto: ${proyecto.numero}, no detail datata was found`)
        continue
      }
      console.log(`Updating proyecto: ${proyecto.numero}, with id: ${proyecto.id}`)
      await db.transaction().execute(async (tx) => {
        await this.senadoRepository.upsertProyectoDetalles(tx, proyecto.id, detalle)
      })
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
      comisionId: tx.selectFrom('comision').select('id').where('nombre', '=', data.comision),
      estado: data.estado.estado,
      estadoAnotacion: data.estado.anotacion,
      numero: numeroSenado,
      numeroCamara,
      titulo: data.titulo,
      fechaRadicado: data.fechaRadicado.toISOString(),
      legislaturaId: tx.selectFrom('legislatura').select('id').where('title', '=', legislatura),
      url: data.url
    }
    // TODO: Replace with ON CONFLICT DO REPLACE
    // https://www.sqlite.org/lang_conflict.html
    const { id: proyectoId } = await tx
      .insertInto('proyectoSenado')
      .values(update)
      .returning('id')
      .onConflict((oc) => oc.doUpdateSet(update))
      .executeTakeFirstOrThrow()

    await this.createRelacionados(tx, proyectoId, data.proyectosAcumulados)
    await this.autorRepository.syncAutoresWithProyecto(tx, proyectoId, data.autores)
    return proyectoId
  }

  async upsertProyectoDetalles(tx: DBTransaction, proyectoId: number, detalles: ProyectoDetailData) {
    await tx.replaceInto('proyectoSenadoDetalles')
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

    await tx.replaceInto('proyectoSenadoPublicaciones')
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

    await tx.insertInto('ponente')
      .values(detalles.ponentes.map((p) => ({ nombre: p.ponente })))
      .onConflict((oc) => oc.doNothing())
      .execute()

    await tx.deleteFrom('ponenteDebate')
      .where('proyectoId', '=', proyectoId)
      .execute()

    await tx.insertInto('ponenteDebate')
      .values(detalles.ponentes.map((p) => ({
        proyectoId,
        ponenteId: tx.selectFrom('ponente').select('id').where('nombre', '=', p.ponente),
        debate: p.debate,
      })))
      .execute()
  }

  async getProyectosLegislatura(legislatura: string) {
    return db
      .selectFrom('proyectoSenado')
      .select(['proyectoSenado.id', 'proyectoSenado.url', 'proyectoSenado.numero'])
      .leftJoin('legislatura', 'legislatura.id', 'proyectoSenado.legislaturaId')
      .where('legislatura.title', '=', legislatura)
      // TODO: Remove this limit
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
      .replaceInto('proyectosRelacionados')
      .values(
        relacionados.map((r) => ({
          proyectoId,
          relacionadoNumero: formatNumeroLegislativo(r)
        }))
      )
      .execute()
  }

  async getLegislatura(cuatrenio: string, legislatura: string) {
    return db
      .selectFrom('legislatura')
      .selectAll()
      .leftJoin('cuatrenio', 'cuatrenio.id', 'legislatura.cuatrenioId')
      .where('cuatrenio.title', '=', cuatrenio)
      .where('legislatura.title', '=', legislatura)
      .executeTakeFirst()
  }
}

class ComisionRepository {
  constructor() { }

  async upsertComisiones(comisiones: string[]) {
    await db
      .insertInto('comision')
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
        .insertInto('autor')
        .values(autores.map((a) => ({ nombre: a })))
        .onConflict((co) => co.doNothing())
        .execute()

      const autoresId = await db
        .selectFrom('autor')
        .select('id')
        .where('nombre', 'in', autores)
        .execute()

      await db.deleteFrom('autorProyectos').where('proyectoId', '=', proyectoId).execute()

      await db
        .insertInto('autorProyectos')
        .columns(['proyectoId', 'autorId'])
        .values(autoresId.map((a) => ({ proyectoId, autorId: a.id })))
        .execute()
    } else {
      console.log('No autores')
    }
  }
}
