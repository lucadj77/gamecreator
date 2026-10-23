// gruppo G: selezione multipla nella griglia, selettore colore, Iconify (con l'API finta: dal
// cloud api.iconify.design non si raggiunge; servono i pacchetti npm in /tmp/stella-guide/ic)
import { launch, shot, shotEl } from './lib.mjs'
const lang = process.argv[2]
const it = lang === 'it'
const { app, win, T } = await launch({ lang, h: 1000 })
const dialog = () => win.locator('[role="dialog"]').last()
await app.evaluate(({ net }) => {
  const fs = process.mainModule.require('fs')
  const base = '/tmp/stella-guide/ic/'
  const collections = JSON.parse(
    fs.readFileSync(base + 'iconify-collections-1.0.753/package/collections.json', 'utf8')
  )
  const packs = {
    mdi: JSON.parse(fs.readFileSync(base + 'iconify-json-mdi-1.2.3/package/icons.json', 'utf8')),
    twemoji: JSON.parse(
      fs.readFileSync(base + 'iconify-json-twemoji-1.2.5/package/icons.json', 'utf8')
    )
  }
  const json = (d) =>
    new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } })
  const original = net.fetch.bind(net)
  net.fetch = async (url, init) => {
    const u = new URL(url)
    // gc-asset:// e il resto passano da net.fetch: si intercetta solo Iconify
    if (u.host !== 'api.iconify.design') return original(url, init)
    if (u.pathname === '/collections') return json(collections)
    if (u.pathname === '/collection')
      return json({ uncategorized: Object.keys(packs[u.searchParams.get('prefix')].icons) })
    if (u.pathname === '/search') {
      const q = u.searchParams.get('query')
      const only = u.searchParams.get('prefix')
      const ids = []
      for (const [prefix, p] of Object.entries(packs))
        if (!only || only === prefix)
          for (const n of Object.keys(p.icons)) if (n.includes(q)) ids.push(`${prefix}:${n}`)
      return json({ icons: ids.slice(0, 999) })
    }
    const m = u.pathname.match(/^\/([a-z0-9-]+)\.json$/)
    const p = packs[m[1]]
    const icons = {}
    for (const n of u.searchParams.get('icons').split(',')) if (p.icons[n]) icons[n] = p.icons[n]
    return json({ prefix: m[1], width: p.width, height: p.height, icons })
  }
})
// griglia: rettangolo di selezione su tre carte
const cells = win.locator('.card-cell')
const c1 = await cells.nth(1).boundingBox()
const c3 = await cells.nth(3).boundingBox()
await win.mouse.move(c3.x + c3.width + 6, c3.y + c3.height + 6)
await win.mouse.down()
await win.mouse.move(c1.x + 30, c1.y + 30, { steps: 10 })
await win.waitForTimeout(300)
await win.mouse.up()
await win.mouse.move(5, 500)
await win.waitForTimeout(2000)
await shot(win, `${lang}/griglia-selezione`)
await win.keyboard.press('Escape')
// iconify
await win.locator('.card-form .pick-btn').first().click()
await win.waitForTimeout(1000)
await dialog().getByRole('button', { name: T['assetPicker.importIcons'] }).click()
await win.waitForTimeout(1500)
await dialog().getByText(T['icons.collection.iconify'], { exact: true }).click()
await win.waitForTimeout(1500)
await dialog().locator('.iconify-sets button', { hasText: 'Material Design Icons' }).first().click()
await win.waitForTimeout(500)
await dialog().getByPlaceholder(T['icons.search']).fill('sword')
await win.waitForTimeout(2500)
await dialog().locator('.asset-tile').nth(1).click()
await dialog().locator('.asset-tile').nth(3).click()
await win.mouse.move(5, 5)
await win.waitForTimeout(600)
await shotEl(win, `${lang}/iconify`, dialog(), 24)
await dialog().getByRole('button', { name: T['dialog.cancel'], exact: true }).click()
await win.waitForTimeout(400)
await dialog().getByRole('button', { name: T['dialog.cancel'], exact: true }).click()
await win.waitForTimeout(400)
// selettore colore nel modulo della carta
await win.locator('.card-form .color-swatch').first().click()
await win.waitForTimeout(600)
const pop = win.locator('.color-popover')
const pb = await pop.boundingBox()
const vp = win.viewportSize()
const x = Math.max(0, pb.x - 160)
await shot(win, `${lang}/colore`, {
  clip: {
    x,
    y: Math.max(0, pb.y - 70),
    width: Math.min(vp.width - x, pb.width + 180),
    height: pb.height + 130
  }
})
await app.close()
