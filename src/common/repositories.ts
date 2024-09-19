import { db } from '../database/index.js'

export class CuatrenioRepository {
  public async getByTitle(title: string) {
    return db.selectFrom('cuatrenio').selectAll().where('title', '=', title).execute()
  }

  public async getLegisltauras(cuatrenioTitle: string) {
    return db
      .selectFrom('legislatura')
      .selectAll()
      .where(
        'cuatrenio_id',
        '=',
        db.selectFrom('cuatrenio').select('id').where('title', '=', cuatrenioTitle)
      )
      .execute()
  }

  public async getAll() {
    return db.selectFrom('cuatrenio').selectAll().execute()
  }
}
