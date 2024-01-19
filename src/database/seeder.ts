import { db } from './index'

const cuatrenios = {
  '2018-2022': {
    start: 2018,
    end: 2022,
    legilsaturas: ['2018-2019', '2019-2020', '2020-2021', '2021-2022']
  },
  '2022-2026': { start: 2022, end: 2026, legilsaturas: ['2022-2023', '2023-2024'] }
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

// Cuatrenios y Legislaturas
async function createCuatrenios() {
  for (const [cuatrenio, data] of Object.entries(cuatrenios)) {
    await db.insertInto('Cuatrenio')
      .values({
        title: cuatrenio,
        inicio: data.start,
        fin: data.end
      })
      .execute()
  }
}

async function createLegislaturas() {
  for (const [cuatrenio, data] of Object.entries(cuatrenios)) {
    const cuatrenioId = (await db.selectFrom('Cuatrenio').select('id').where('title', '=', cuatrenio).executeTakeFirstOrThrow()).id
    for (const legislatura of data.legilsaturas) {
      await db.insertInto('Legislatura')
        .values({
          title: legislatura,
          inicio: parseInt(legislatura.split('-')[0]!!),
          fin: parseInt(legislatura.split('-')[1]!!),
          cuatrenioId,
        })
        .execute()
    }
  }
}

async function createComisiones() {
  for (const comision of comisiones) {
    await db.insertInto('Comision')
      .values({
        nombre: comision
      })
      .execute()
  }
}

async function main() {
  await createCuatrenios()
  await createLegislaturas()
  await createComisiones()
}

main().catch((e) => {
  console.error('Error seeding database', e)
  process.exit(1)
})

