import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cuatrenios = {
  "2018-2022": { start: 2018, end: 2022, legilsaturas: ["2018-2019", "2019-2020", "2020-2021", "2021-2022"] },
  "2022-2026": { start: 2022, end: 2026, legilsaturas: ["2022-2023"] },
}

const comisiones = [
  "ECONOMICAS",
  "NO ASIGNADA",
  "PRIMERA",
  "QUINTA",
  "SEGUNDA",
  "SEPTIMA",
  "SEXTA",
  "TERCERA"
]

// Cuatrenios y Legislaturas
async function createCuatrenios() {
  for (const [cuatrenio, data] of Object.entries(cuatrenios)) {
    await prisma.cuatrenio.create({
      data: {
        title: cuatrenio,
        inicio: data.start,
        fin: data.end,
      }
    })
  }
}

async function createLegislaturas() {
  for (const [cuatrenio, data] of Object.entries(cuatrenios)) {
    for (const legislatura of data.legilsaturas) {
      await prisma.legislatura.create({
        data: {
          title: legislatura,
          inicio: parseInt(legislatura.split("-")[0]),
          fin: parseInt(legislatura.split("-")[1]),
          cuatrenio: { connect: { title: cuatrenio } },
        }
      })
    }
  }
}

async function createComisiones() {
  for (const comision of comisiones) {
    await prisma.comision.create({
      data: {
        nombre: comision,
      }
    })
  }
}

async function main() {
  await createCuatrenios();
  await createLegislaturas();
  await createComisiones();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error seeding database', e);
  process.exit(1);
});
