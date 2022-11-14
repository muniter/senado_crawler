// import { PrismaClient, PrismaPromise } from "@prisma/client";
// import { NumeroIdentificador, ProyectoBasicData } from "../crawler/formatters";
// import { getLegislaturaProyectsBasicData } from "../crawler/senado";
//
// function formatNumeroSenado(numero: NumeroIdentificador) {
//   return `${numero.numero}/${numero.year}`;
// }
// // This is the class to call for the lifecycle of the information
// export class SenadoService {
//
//   constructor(
//     private prisma: PrismaClient,
//     private senadoRepository: SenadoRepository
//   ) { }
//
//   async refreshProyectos(cuaternio: string, legislatura: string) {
//     // Asserts they exist
//     if (await this.senadoRepository.getLegislatura(cuaternio) === null) {
//       throw new Error(`Legislatura ${cuaternio} does not exist`);
//     }
//     const data = await getLegislaturaProyectsBasicData(cuaternio, legislatura);
//     await this.senadoRepository.upsertProyectos(data);
//     // Send it to the databas
//   }
// }
//
// export class SenadoRepository {
//   constructor(
//     private prisma: PrismaClient
//   ) {
//   }
//
//   async upsertProyectos(proyecto: ProyectoBasicData[]) {
//     await this.prisma.$transaction(
//       // @ts-expect-error
//       proyecto.map(async (proyecto) => {
//         const numero = formatNumeroSenado(proyecto.numeroSenado);
//         const data = {
//           numero,
//           titulo: proyecto.titulo,
//           comision: proyecto.comision,
//           estado: proyecto.estado,
//           fechaRadica: proyecto.fechaRadicado,
//         }
//         return this.prisma.proyectoSenado.upsert({
//           where: { numero},
//           create: proyecto,
//           update: proyecto,
//         });
//       }))
//   }
//
//   async getCuaternioDescription(cuaternio: string) {
//     return this.prisma.cuaternio.findUnique({
//       where: { title: cuaternio },
//       select: {
//         title: true,
//         legislaturas: {
//           select: {
//             title: true,
//           }
//         },
//       }
//     });
//   }
//
//   async getLegislatura(cuaternio: string, legislatura: string) {
//     return this.prisma.cuaternio.findFirst({
//       where: {
//         AND: [
//           { title: legislatura },
//           { legislaturas: { some: { title: legislatura } } },
//         ],
//       }
//     })
//   }
// }
