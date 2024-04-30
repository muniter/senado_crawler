import { type Insertable } from "kysely";
import { CuatrenioRepository } from "../../common/repositories.js";
import { type DBTransaction, db } from "../../database/index.js";
import { type DetailData, Extractor } from "./crawler.js";
import { type ProyectosSenado } from "../../database/schema.js";
import { getDatePart } from "../../common/utils.js";
import { logger } from "../../utils/logger.js";

export class SenadoService {
  public async refreshCuatrenio(cuatrenio: string) {
    const legislaturas = await (new CuatrenioRepository().getLegisltauras(cuatrenio))
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
    });
    logger.info(`Finished refreshing cuatrenio ${cuatrenio} / legislatura ${legislatura}`)
  }
}

class SenadoRepository {
  private table = 'ProyectosSenado' as const
  private tx: DBTransaction | undefined

  public constructor(tx?: DBTransaction) {
    this.tx = tx
  }

  private get conn() {
    return this.tx ? this.tx : db
  }

  private async exists({ numero, legislatura }: { numero: string, legislatura: string }) {
    return (await this.conn
      .selectFrom(this.table)
      .select('id')
      .where('numero', '=', numero)
      .where('legislatura', '=', legislatura)
      .executeTakeFirst()) !== undefined
  }

  private prepareData(data: DetailData): Insertable<ProyectosSenado> {
    return {
      id_senado: data.id_senado,
      numero: data.numero,
      numeroCamara: data.numeroCamara,
      titulo: data.titulo,
      legislatura: data.legislatura,
      url: data.url,
      estado: data.estado,
      estadoAnotacion: data.estadoAnotacion,
      comision: data.comision,
      fechaRadicado: getDatePart(data.fechaRadicado),
      fechaDePresentacion: getDatePart(data.fechaPresentacion),
      origen: data.origen,
      tipoLey: data.tipoLey,
      fechaEnvioComision: data.fechaEnvioComision ? getDatePart(data.fechaEnvioComision) : null,
      fechaAprobacionPrimerDebate: data.fechaAprobacionPrimerDebate ? getDatePart(data.fechaAprobacionPrimerDebate) : null,
      fechaAprobacionSegundoDebate: data.fechaAprobacionSegundoDebate ? getDatePart(data.fechaAprobacionSegundoDebate) : null,
      fechaConciliacion: data.fechaConciliacion ? getDatePart(data.fechaConciliacion) : null,
      autores: JSON.stringify(data.autores),
      exposicionMotivos: data.exposicionMotivos,
      primeraPonencia: data.primeraPonencia,
      segundaPonencia: data.segundaPonencia,
      textoPlenaria: data.textoPlenaria,
      conciliacion: data.conciliacion,
      objeciones: data.objeciones,
      concepto: data.concepto,
      textoRehecho: data.textoRehecho,
      sentenciaCorte: data.sentenciaCorte,
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
    await this.conn
      .insertInto(this.table)
      .values(this.prepareData(data))
      .execute()
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
