// gruppo A: schermata di ingresso
import { launch, shot, shotEl } from './lib.mjs'
import { rmSync } from 'node:fs'
const lang = process.argv[2]
rmSync('/tmp/stella-guide/ud-' + lang, { recursive: true, force: true })
const { app, win, T } = await launch({ lang })
// progetto aperto, poi chiuso: la schermata mostra il recente con la miniatura
await win.waitForTimeout(1500)
await win.getByRole('button', { name: `${T['app.projectMenu']} ▾` }).click()
await win.getByRole('menuitem', { name: T['app.closeProjectLong'] }).click()
await win.waitForTimeout(1500)
await shot(win, `${lang}/ingresso`)
await win.getByText(T['start.newProject']).click()
await win.waitForTimeout(600)
await win
  .locator('[role="dialog"] input')
  .first()
  .fill(lang === 'it' ? 'Il mio gioco' : 'My game')
await shotEl(win, `${lang}/nuovo-progetto`, win.locator('[role="dialog"]').first(), 24)
await win
  .locator('[role="dialog"]')
  .getByRole('button', { name: T['dialog.cancel'], exact: true })
  .click()
await win.waitForTimeout(400)
await win.getByText(T['start.importTtc']).click()
await win.waitForTimeout(800)
await shotEl(win, `${lang}/importa-ttc`, win.locator('[role="dialog"]').first(), 24)
await app.close()
