import { readFileSync } from 'fs';
import { load } from 'cheerio';
import { processRow, ProyectoBasicData } from './formatters';

function getCheerio() {
  // Load the HTML form the fix
  const html = readFileSync('./fixtures/SenadoList.html').toString();
  const parsed = JSON.parse(readFileSync('./fixtures/SenadoList.json').toString()) as Record<string, ProyectoBasicData>;

  return { $: load(html), parsed };
}

function convertDate(item: ProyectoBasicData): ProyectoBasicData {
  return {
    ...item,
    fechaRadicado: new Date(item.fechaRadicado)
  }
}

function getTable(className: string) {
  const {$, parsed } = getCheerio()
  const table = $(`.${className}`)
  if (table.length === 0 || table.html() === null) {
    throw new Error(`Table ${className} not found in fixtures`)
  }
  const expected = parsed[className]
  if (expected === undefined) {
    throw new Error(`Table ${className} not found in parsed fixtures`)
  }
  return { $, table, expected: convertDate(expected) }
}

it('should parse a complete row', () => {
  const { $, table, expected } = getTable('completo')
  // @ts-ignore
  const res = processRow($, table)
  expect(res).toEqual(expected)
});
