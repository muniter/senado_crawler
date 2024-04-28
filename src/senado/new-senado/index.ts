import { Insertable } from "kysely";
import { CuatrenioRepository } from "../../common/repositories";
import { DBTransaction, db } from "../../database";
import { DetailData, Extractor } from "./crawler";
import { ProyectosSenadoNew } from "../../database/schema";

class SenadoService {
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
      const repo = new SenadoRepository(tx)
      const result = await extractor.process()
      console.log('Extracted', result.length, 'items')
      for (const data of result) {
        await repo.save(data)
      }
    });
    console.log(`Finished refreshing cuatrenio ${cuatrenio} / legislatura ${legislatura}`)
  }
}

class SenadoRepository {
  private table = 'ProyectosSenadoNew' as const
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

  private prepareData(data: DetailData): Insertable<ProyectosSenadoNew> {
    return {
      numero: data.numero,
      numeroCamara: data.numeroCamara,
      titulo: data.titulo,
      legislatura: data.legislatura,
      url: data.url,
      estado: data.estado,
      estadoAnotacion: data.estadoAnotacion,
      comision: data.comision,
      fechaRadicado: data.fechaRadicado.toISOString().split('T')[0]!,
      fechaDePresentacion: data.fechaPresentacion.toISOString().split('T')[0]!,
      origen: data.origen,
      tipoLey: data.tipoLey,
      fechaEnvioComision: data.fechaEnvioComision?.toISOString().split('T')[0],
      fechaAprobacionPrimerDebate: data.fechaAprobacionPrimerDebate?.toISOString().split('T')[0],
      fechaAprobacionSegundoDebate: data.fechaAprobacionSegundoDebate?.toISOString().split('T')[0],
      fechaConciliacion: data.fechaConciliacion?.toISOString().split('T')[0],
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

new SenadoService().refreshCuatrenio('2022-2026')