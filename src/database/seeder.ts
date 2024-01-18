import { db } from './index'

const cuatrenios = {
  '2018-2022': {
    start: 2018,
    end: 2022,
    legilsaturas: [
      {
        nombre: '2018-2019',
        camaraId: 88,
      },
      {
        nombre: '2019-2020',
        camaraId: 1097,
      },
      {
        nombre: '2020-2021',
        camaraId: 96,
      },
      {
        nombre: '2021-2022',
        camaraId: 97,
      },
    ]
  },
  '2022-2026': {
    start: 2022,
    end: 2026,
    legilsaturas: [
      {
        nombre: '2022-2023',
        camaraId: 1240,
      },
      {
        nombre: '2023-2024',
        camaraId: 1474,
      },
    ]
  }
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
          title: legislatura.nombre,
          inicio: parseInt(legislatura.nombre.split('-')[0]!!),
          fin: parseInt(legislatura.nombre.split('-')[1]!!),
          camaraId: legislatura.camaraId,
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

