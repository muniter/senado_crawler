import { db } from '../database/index.js'

export class CuatrenioRepository {
  public async getByTitle(title: string) {
    return db.selectFrom('Cuatrenio').selectAll().where('title', '=', title).execute()
  }

  public async getLegisltauras(cuatrenioTitle: string) {
    return db
      .selectFrom('Legislatura')
      .selectAll()
      .where(
        'cuatrenioId',
        '=',
        db.selectFrom('Cuatrenio').select('id').where('title', '=', cuatrenioTitle)
      )
      .execute()
  }

  public async getAll() {
    return db.selectFrom('Cuatrenio').selectAll().execute()
  }
}
