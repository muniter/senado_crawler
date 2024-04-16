import { db } from '../database';

export class CuatrenioRepository {

  public async getByTitle(title: string) {
    return db
      .selectFrom('Cuatrenio')
      .selectAll()
      .where('title', '=', title)
      .execute()
  }

  public async getLegisltauras(cuatrenioTitle: string) {
    return db
      .selectFrom('Legislatura')
      .selectAll()
      .where('cuatrenioId', '=', db.selectFrom('Cuatrenio').select('id').where('title', '=', cuatrenioTitle))
      .execute()
  }
}
