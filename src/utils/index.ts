export function processListOfPersonas(raw: string): string[] {
  let items = raw
    .replaceAll('\t', ' ')
    .replace(/("|')/g, '')
    .split(/,|;|\n/)
  items = items.map((autor) => autor.trim()).filter((autor) => autor.match(/\w{5,}/))

  const unique = new Set(items)
  return [...unique]
}
