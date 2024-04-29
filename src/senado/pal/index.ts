import { assert } from 'console';
import { DBTransaction, db } from '../../database';
import { DetailData, Extractor } from './crawler';
import { CuatrenioRepository } from '../../common/repositories';
import { Insertable } from 'kysely';
import { ProyectosActoLegislativoSenado } from '../../database/schema';

export class PalService {

  public async refreshCuatrenio(cuatrenio: string) {
    const legislaturas = await (new CuatrenioRepository().getLegisltauras(cuatrenio))
    for (const legislatura of legislaturas) {
      await this.refresh(cuatrenio, legislatura.title)
    }
  }

  public async refresh(cuatrenio: string, legislatura: string) {
    console.log(`Refreshing cuatrenio ${cuatrenio} and legislatura ${legislatura}`)
    await db.transaction().execute(async (tx) => {
      const extractor = new Extractor(cuatrenio, legislatura)
      const repo = new PalRepository(tx)
      const result = await extractor.process()
      console.log('Extracted', result.length, 'items')
      for (const data of result) {
        await repo.save(data)
      }
    });
  }
}

class PalRepository {
  private table = 'ProyectosActoLegislativoSenado' as const
  private tx: DBTransaction | undefined

  public constructor(tx?: DBTransaction) {
    this.tx = tx
  }

  // Getter for the connection which is a transaction or the connection itself
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

  private prepareData(data: DetailData): Insertable<ProyectosActoLegislativoSenado> {
    return {
      id_senado: data.id_senado,
      estado: data.estado,
      estadoAnotacion: data.estadoAnotacion,
      numero: data.numero,
      numeroCamara: data.numeroCamara,
      titulo: data.titulo,
      origen: data.origen,
      url: data.url,
      legislatura: data.legislatura,
      acumulados: JSON.stringify(data.acumulados),
      autores: JSON.stringify(data.autores),
      fechaDePresentacion: data.fechaDePresentacion?.toISOString().split('T')[0],
      ponentesPrimerDebate: JSON.stringify(data.ponentesPrimerDebate),
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
