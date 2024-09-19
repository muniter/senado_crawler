//import { db } from '../database'

const CUATRENIOS: Record<string, { inicio: number; fin: number; legilsaturas: string[] }> = {
  '2018-2022': {
    inicio: 2018,
    fin: 2022,
    legilsaturas: ['2018-2019', '2019-2020', '2020-2021', '2021-2022']
  },
  '2022-2026': { inicio: 2022, fin: 2026, legilsaturas: ['2022-2023'] }
}

const comisiones = [
  'ECONOMICAS',
  'NO ASIGNADA',
  'PRIMERA',
  'QUINTA',
  'SEGUNDA',
  'SEPTIMA',
  'SEXTA',
  'TERCERA'
]

//async function seedDatabase() {
//  await db.transaction().execute(async (tx) => {
//    await tx
//      .insertInto('Comision')
//      .values(comisiones.map((nombre) => ({ nombre })))
//      .execute()
//
//    await Promise.all(
//      Object.entries(CUATRENIOS).map(async ([_, { inicio, fin, legilsaturas }]) => {
//        const { id: cuatrenio_id } = await tx
//          .insertInto('Cuatrenio')
//          .values({ inicio, fin, title: `${inicio}-${fin}` })
//          .returningAll()
//          .executeTakeFirstOrThrow()
//
//        legilsaturas.forEach(async (legislatura) => {
//          const [inicio, fin] = legislatura.split('-')
//          await tx
//            .insertInto('Legislatura')
//            .values({
//              cuatrenio_id,
//              inicio: parseInt(inicio!),
//              fin: parseInt(fin!),
//              camara_id: 5,
//            })
//            .executeTakeFirstOrThrow()
//        })
//      })
//    )
//  })
//  process.exit(0)
//}
//
//seedDatabase()
