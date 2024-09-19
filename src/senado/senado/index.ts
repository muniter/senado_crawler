import { type Insertable } from 'kysely'
import { CuatrenioRepository } from '../../common/repositories.js'
import { type DBTransaction, db } from '../../database/index.js'
import { type DetailData, Extractor } from './crawler.js'
import { type Senado } from '../../database/schema.js'
import { getDatePart } from '../../common/utils.js'
import { logger } from '../../utils/logger.js'

export class SenadoService {
  public async refreshCuatrenio(cuatrenio: string) {
    const legislaturas = await new CuatrenioRepository().getLegisltauras(cuatrenio)
    for (const legislatura of legislaturas) {
      await this.refreshLegislatura(cuatrenio, legislatura.title)
    }
  }

  public async refreshLegislatura(cuatrenio: string, legislatura: string) {
    logger.info(`Refreshing cuatrenio ${cuatrenio} and legislatura ${legislatura}`)
    await db.transaction().execute(async (tx) => {
      const extractor = new Extractor(cuatrenio, legislatura)
      const repo = new SenadoRepository(tx)
      const result = await extractor.process()
      logger.info('Extracted', result.length, 'items')
      for (const data of result) {
        await repo.save(data)
      }
    })
    logger.info(`Finished refreshing cuatrenio ${cuatrenio} / legislatura ${legislatura}`)
  }
}

class SenadoRepository {
  private table = 'senado' as const
  private tx: DBTransaction | undefined

  public constructor(tx?: DBTransaction) {
    this.tx = tx
  }

  private get conn() {
    return this.tx ? this.tx : db
  }

  private async exists({ numero, legislatura }: { numero: string; legislatura: string }) {
    return (
      (await this.conn
        .selectFrom(this.table)
        .select('id')
        .where('numero', '=', numero)
        .where('legislatura', '=', legislatura)
        .executeTakeFirst()) !== undefined
    )
  }

  private prepareData(data: DetailData): Insertable<Senado> {
    return {
      id_senado: data.id_senado,
      numero: data.numero,
      numero_camara: data.numero_camara,
      titulo: data.titulo,
      legislatura: data.legislatura,
      url: data.url,
      estado: data.estado,
      estado_anotacion: data.estado_anotacion,
      comision: data.comision,
      fecha_radicado: getDatePart(data.fecha_radicado),
      fecha_de_presentacion: getDatePart(data.fechaPresentacion),
      origen: data.origen,
      tipo_ley: data.tipo_ley,
      fecha_envio_comision: data.fecha_envio_comision ? getDatePart(data.fecha_envio_comision) : null,
      fecha_aprobacion_primer_debate: data.fecha_aprobacion_primer_debate
        ? getDatePart(data.fecha_aprobacion_primer_debate)
        : null,
      fecha_aprobacion_segundo_debate: data.fecha_aprobacion_segundo_debate
        ? getDatePart(data.fecha_aprobacion_segundo_debate)
        : null,
      fecha_conciliacion: data.fecha_conciliacion ? getDatePart(data.fecha_conciliacion) : null,
      autores: JSON.stringify(data.autores),
      exposicion_motivos: data.exposicion_motivos,
      primera_ponencia: data.primera_ponencia,
      segunda_ponencia: data.segunda_ponencia,
      texto_plenaria: data.texto_plenaria,
      conciliacion: data.conciliacion,
      objeciones: data.objeciones,
      concepto: data.concepto,
      texto_rehecho: data.texto_rehecho,
      sentencia_corte: data.sentencia_corte
    }
  }

  public async save(data: DetailData) {
    if (await this.exists({ numero: data.numero, legislatura: data.legislatura })) {
      await this.update(data)
    } else {
      await this.insert(data)
    }
  }

  private async insert(data: DetailData) {
    await this.conn.insertInto(this.table).values(this.prepareData(data)).execute()
  }

  private async update(data: DetailData) {
    await this.conn
      .updateTable(this.table)
      .set(this.prepareData(data))
      .where('numero', '=', data.numero)
      .where('legislatura', '=', data.legislatura)
      .execute()
  }
}
