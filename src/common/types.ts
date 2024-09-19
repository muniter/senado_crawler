import { load, type Cheerio } from 'cheerio'
// https://github.com/cheeriojs/cheerio/issues/3988
function cheerioHack() {
  const api = load('<p>Trash function to just extract the cheerio type they stopped exporting</p>')
  return api('h2')
}
cheerioHack()

export type Element = ReturnType<typeof cheerioHack> extends Cheerio<infer T> ? T : never
