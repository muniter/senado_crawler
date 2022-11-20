import { PrismaClient, Prisma } from "@prisma/client";
import { NumeroIdentificador, ProyectoBasicData, ProyectoDetailData } from "../crawler/formatters";
import { getLegislaturaProyectsBasicData, getProyectoDetails } from "../crawler/senado";

function formatNumeroSenado(numero: NumeroIdentificador) {
  return `${numero.numero}/${numero.year}`;
}
// This is the class to call for the lifecycle of the information
export class SenadoService {

  constructor(
    private senadoRepository: SenadoRepository = new SenadoRepository()
  ) { }

  async refreshProyectos(cuatrenio: string, legislatura: string) {
    // Asserts they exist
    const exists = await this.senadoRepository.getLegislatura(cuatrenio, legislatura)
    if (exists === null) {
      throw new Error(`Legislatura ${cuatrenio} does not exist`);
    }
    const data = await getLegislaturaProyectsBasicData(cuatrenio, legislatura);
    console.log(`Parsed proyects ${data.length} data from cuatrenio ${cuatrenio} and legislatura ${legislatura}`);
    await this.senadoRepository.upsertProyectosFromBasicData(legislatura, data);
    try {
    await this.refreshProyectoDetalles(legislatura)
    } catch (e) {
      console.error("Failed to refresh detalles", e);
    }
  }

  async refreshProyectoDetalles(legislatura: string) {
    const proyectos = await this.senadoRepository.getProyectosLegislatura(legislatura);
    for (const proyecto of proyectos) {
      console.log(`Refreshing proyecto ${proyecto.numero} with url ${proyecto.url}`);
      const detalles = await getProyectoDetails(proyecto.url);
      await this.senadoRepository.upsertProyectoDetalles(proyecto.id, detalles);
    }
  }
}

export class SenadoRepository {
  constructor(
    private prisma: PrismaClient = new PrismaClient(),
    private comisionRepository: ComisionRepository = new ComisionRepository(),
    private autorRepository: AutorRepository = new AutorRepository(),
  ) {
  }

  async upsertProyectosFromBasicData(legislatura: string, proyecto: ProyectoBasicData[]) {
    await this.comisionRepository.upsertComisiones(proyecto.map(p => p.comision));
    await this.autorRepository.upsertAutores(proyecto.map(p => p.autores).flat());
    for (const p of proyecto) {
      const numero = formatNumeroSenado(p.numeroSenado);
      const data = this.basicDataToDb(legislatura, p);
      const { id: proyectoId } = await this.prisma.proyectoSenado.upsert({
        select: { id: true },
        where: { numero },
        create: data,
        update: data,
      });
      await this.autorRepository.syncAutoresWithProyecto(proyectoId, p.autores);
      await this.createRelacionados(proyectoId, p.proyectosAcumulados);
    }
  }

  async upsertProyectoDetalles(proyectoId: number, detalles: ProyectoDetailData) {
    const data: Prisma.ProyectoSenadoDetallesCreateInput = {
      proyecto: { connect: { id: proyectoId } },
      origen: detalles.origen,
      tipoLey: detalles.tipoLey,
      fechaEnvioComision: detalles.fechaEnvioComision,
    }
    await this.prisma.proyectoSenadoDetalles.upsert({
      where: { proyectoId },
      create: data,
      update: data,
    });
  }

  async getProyectosLegislatura(legislatura: string) {
    const proyectos = await this.prisma.proyectoSenado.findMany({
      where: {
        legislatura: {
          title: legislatura,
        },
      },
      take: 10,
    })
    return proyectos
  }

  async createRelacionados(proyectoId: number, relacionados: NumeroIdentificador[]) {
    for (const rel of relacionados) {
      await this.prisma.proyectosRelacionados.create({
        data: {
          proyectoId,
          relacionadoNumero: formatNumeroSenado(rel),
        }
      })
    }
  }

  async getLegislatura(cuatrenio: string, legislatura: string) {
    return this.prisma.cuatrenio.findFirst({
      where: {
        AND: [
          { title: cuatrenio },
          { legislaturas: { some: { title: legislatura } } },
        ],
      }
    })
  }

  basicDataToDb(legislatura: string, proyecto: ProyectoBasicData): Prisma.ProyectoSenadoCreateInput {
    return {
      numero: formatNumeroSenado(proyecto.numeroSenado),
      titulo: proyecto.titulo,
      comision: { connect: { nombre: proyecto.comision } },
      estado: proyecto.estado.estado,
      estadoAnotacion: proyecto.estado.anotacion,
      fechaRadicado: proyecto.fechaRadicado,
      legislatura: { connect: { title: legislatura } },
      url: proyecto.url,
    }
  }
}

class ComisionRepository {
  constructor(
    private prisma: PrismaClient = new PrismaClient()
  ) { }

  async upsertComisiones(comisiones: string[]) {
    for (const c of comisiones) {
      await this.prisma.comision.upsert({
        where: { nombre: c },
        create: { nombre: c },
        update: { nombre: c },
      });
    }
  }
}

class AutorRepository {
  constructor(
    private prisma: PrismaClient = new PrismaClient()
  ) { }

  async upsertAutores(autores: string[]) {
    for (const a of autores) {
      await this.prisma.autor.upsert({
        where: { nombre: a },
        create: { nombre: a },
        update: { nombre: a },
      });
    }
  }

  async syncAutoresWithProyecto(proyectoId: number, autores: string[]) {
    // Crear autores
    await this.upsertAutores(autores);
    await this.prisma.autorProyectos.deleteMany({
      where: { proyectoId },
    });
    for (const a of autores) {
      await this.prisma.autorProyectos.create({
        data: {
          proyecto: { connect: { id: proyectoId } },
          autor: { connect: { nombre: a }, }
        }
      });
    }
  }
}
