import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cuaternios = {
  "2018-2022": { start: 2018, end: 2022, subperiodos: ["2018-2019", "2019-2020", "2020-2021", "2021-2022"] },
  "2022-2026": { start: 2022, end: 2026, subperiodos: ["2022-2023"] },
}

// Cuaternios y Legislaturas
async function createCuaternios() {
  Object.entries(cuaternios).forEach(async ([cuaternio, data]) => {
    const { id: cuaternioId } = await prisma.cuaternio.create({
      select: { id: true },
      data: {
        title: cuaternio,
        inicio: data.start,
        fin: data.end,
      }
    })

    data.subperiodos.forEach((subperiodo) => {
      prisma.legislatura.create({
        data: {
          cuaternio: { connect: { id: cuaternioId } },
          title: subperiodo,
          inicio: parseInt(subperiodo.split('-')[0]),
          fin: parseInt(subperiodo.split('-')[1]),
        }
      })
    })
  })
}

async function main() {
  await createCuaternios();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error seeding database', e);
  process.exit(1);
});
