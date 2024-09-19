import { type DBTransaction, db } from '../../database/index.js'
import { type DetailData, Extractor } from './crawler.js'
import { CuatrenioRepository } from '../../common/repositories.js'
import { type Insertable } from 'kysely'
import { type SenadoPal } from '../../database/schema.js'
import { logger } from '../../utils/logger.js'

export class PalService {
  public async refreshCuatrenio(cuatrenio: string) {
    const legislaturas = await new CuatrenioRepository().getLegisltauras(cuatrenio)
    if (legislaturas.length === 0) {
      logger.error(`No legislaturas found for cuatrenio ${cuatrenio}`)
      return
    }
    for (const legislatura of legislaturas) {
      await this.refreshLegislatura(cuatrenio, legislatura.title)
    }
  }

  public async refreshLegislatura(cuatrenio: string, legislatura: string) {
    const child_logger = logger.child({ cuatrenio, legislatura })
    child_logger.info(`Refreshing cuatrenio`)
    await db.transaction().execute(async (tx) => {
      const extractor = new Extractor(cuatrenio, legislatura)
      const repo = new PalRepository(tx)
      const result = await extractor.process()
      logger.info('Extracted', result.length, 'items')
      for (const data of result) {
        await repo.save(data)
      }
      child_logger.info(`Saved ${result.length} items`)
    })
    child_logger.info(`Finished refreshing cuatrenio`)
  }
}

class PalRepository {
  private table = 'senado_pal' as const
  private tx: DBTransaction | undefined

  public constructor(tx?: DBTransaction) {
    this.tx = tx
  }

  // Getter for the connection which is a transaction or the connection itself
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

  private prepareData(data: DetailData): Insertable<SenadoPal> {
    return {
      id_senado: data.id_senado,
      estado: data.estado,
      estado_anotacion: data.estado_anotacion,
      numero: data.numero,
      numero_camara: data.numero_camara,
      titulo: data.titulo,
      origen: data.origen,
      url: data.url,
      legislatura: data.legislatura,
      acumulados: JSON.stringify(data.acumulados),
      autores: JSON.stringify(data.autores),
      fecha_de_presentacion: data.fecha_de_presentacion?.toISOString().split('T')[0],
      ponentes_primer_debate: JSON.stringify(data.ponentes_primer_debate)
    }
  }

  public async save(data: DetailData) {
    if (await this.exists({ numero: data.numero, legislatura: data.legislatura })) {
      await this.update(data)
    } else {
      await this.insert(data)
    }
    logger.debug(`Saved item ${data.numero}`)
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
