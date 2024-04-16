import { readFileSync } from 'fs'
import { load } from 'cheerio'
import { processSenadoList, ProyectoBasicData } from './list-processor'

function getCheerio() {
  const { raw, parsed } = getFixtures()
  return { $: load(raw), parsed }
}

function getFixtures() {
  const raw = readFileSync('./fixtures/SenadoList.html').toString()
  const parsed = JSON.parse(readFileSync('./fixtures/SenadoList.json').toString()) as Record<
    string,
    ProyectoBasicData
  >
  expect(parsed.length).toBeGreaterThan(0)
  return { raw, parsed }
}

function convertDate(item: ProyectoBasicData): ProyectoBasicData {
  return {
    ...item,
    fechaRadicado: new Date(item.fechaRadicado)
  }
}

it('should parse a complete row', () => {
  const { raw, parsed } = getFixtures()
  const result = processSenadoList(raw)
  expect(result.length).toBeGreaterThan(0)
  result.forEach((value, index) => {
    const parsedItem = parsed[index]
    if (!parsedItem) {
      throw new Error(`No parsed item for index ${index}`)
    }
    expect(value).toEqual(convertDate(parsedItem))
  })
})
