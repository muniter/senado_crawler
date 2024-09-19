import { db } from './index.js'

const cuatrenios = {
  '2018-2022': {
    start: 2018,
    end: 2022,
    legilsaturas: [
      {
        nombre: '2018-2019',
        camara_id: 88
      },
      {
        nombre: '2019-2020',
        camara_id: 1097
      },
      {
        nombre: '2020-2021',
        camara_id: 96
      },
      {
        nombre: '2021-2022',
        camara_id: 97
      }
    ]
  },
  '2022-2026': {
    start: 2022,
    end: 2026,
    legilsaturas: [
      {
        nombre: '2022-2023',
        camara_id: 1240
      },
      {
        nombre: '2023-2024',
        camara_id: 1474
      }
    ]
  }
}

// Cuatrenios y Legislaturas
async function createCuatrenios() {
  for (const [cuatrenio, data] of Object.entries(cuatrenios)) {
    await db
      .insertInto('cuatrenio')
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
    const cuatrenio_id = (
      await db
        .selectFrom('cuatrenio')
        .select('id')
        .where('title', '=', cuatrenio)
        .executeTakeFirstOrThrow()
    ).id
    for (const legislatura of data.legilsaturas) {
      await db
        .insertInto('legislatura')
        .values({
          title: legislatura.nombre,
          inicio: parseInt(legislatura.nombre.split('-')[0]!!),
          fin: parseInt(legislatura.nombre.split('-')[1]!!),
          camara_id: legislatura.camara_id,
          cuatrenio_id
        })
        .execute()
    }
  }
}

async function main() {
  await createCuatrenios()
  await createLegislaturas()
}

main().catch((e) => {
  console.error('Error seeding database', e)
  process.exit(1)
})
