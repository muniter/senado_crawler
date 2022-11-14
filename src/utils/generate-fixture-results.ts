import { processSenadoList } from "../crawler/formatters";
import { writeFileSync } from "fs";
import { Command } from "commander";
import * as http from "http";
import * as fs from "fs";

const program = new Command("generate-fixtures");
program.description(
  "Generates fixtures for the tests, parses an HTML file, and outputs the parsed data as JSON"
);
program.requiredOption("--source <file/url>", "HTML file to process");
program.option("--output <file>", "JSON file to write, STDOUT if not provided");
program.option("--output-src <file>", "Write the HTML source retrieved from the <file/url>");
program.action(main);

async function main(options: Record<any, any>) {
  const data = await getSource(options);
  const parsed = processSenadoList(data);
  let output: string | number = process.stdout.fd;
  if (options.output && typeof options.output === "string") {
    output = options.output;
    try {
      fs.accessSync(output);
    } catch (e) {
      console.error(
        "Error: output file does not exist, or does not have write permissions"
      );
      process.exit(1);
    }
  }
  writeFileSync(output, JSON.stringify(parsed, null, 2), { encoding: "utf8" });
  if (options.outputSrc) {
    writeFileSync(options.outputSrc, data, { encoding: "utf8" });
  }
  process.exit(0);
}

async function getSource(options: Record<any, any>): Promise<string> {
  if (!options.source) {
    program.help();
    return "";
  }
  if (options.source.startsWith("http")) {
    return new Promise<string>((resolve, reject) => {
      http.get(options.source, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
        res.on("error", (err) => {
          reject(new Error(`Error getting ${options.source}: ${err.message}`));
        });
      });
    });
  } else {
    // Check that the file exists
    try {
      fs.accessSync(options.source);
      return fs.readFileSync(options.source).toString();
    } catch (error) {
      throw new Error(
        `File ${options.source} not found, or does not have read permissions`
      );
    }
  }
}

program.parse();