import { SenadoService } from "../senado/index";
import { z } from "zod";
import { Command } from "commander";
const program = new Command();
program.description("Refreshes the data from the senado");
program.requiredOption("--cuatrenio <string>", "Cuatrenio to refresh");
program.requiredOption("--legislatura <string>", "Legislatura to refresh");
program.action(main);

async function main(options: any) {
  console.log(options)
  const { cuatrenio, legislatura } = z.object({ cuatrenio: z.string(), legislatura: z.string() }).parse(options);
  const senadoService = new SenadoService();
  await senadoService.refreshProyectos(cuatrenio, legislatura);
}

program.parse(process.argv);
