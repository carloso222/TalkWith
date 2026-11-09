// Prueba manual DoD-18 de TW 07, automatizada contra los emuladores (proyecto demo-talkwith).
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const APP = 'http://localhost:5173'
const FS = 'http://127.0.0.1:8080/v1/projects/demo-talkwith/databases/(default)/documents'
const DIR = 'capturas'
mkdirSync(DIR, { recursive: true })

const resultados = []
const ok = (paso, detalle) => { resultados.push(`✅ ${paso}: ${detalle}`); console.log(resultados.at(-1)) }
const falla = (paso, detalle) => { resultados.push(`❌ ${paso}: ${detalle}`); console.log(resultados.at(-1)); throw new Error(paso) }

async function docFs(ruta) {
  const r = await fetch(`${FS}/${ruta}`, { headers: { Authorization: 'Bearer owner' } })
  return r.ok ? (await r.json()).fields : null
}
async function cuentas() {
  const r = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-talkwith/accounts', { headers: { Authorization: 'Bearer owner' } })
  return (await r.json()).userInfo ?? []
}

async function entrarConGoogle(page, nombre, usuario) {
  page.on('console', (m) => { if (m.type() === 'error') console.log('[consola]', m.text()) })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto(`${APP}/login`)
  await page.getByRole('button', { name: /Continuar con Google/i }).waitFor({ timeout: 30000 })
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: /Continuar con Google/i }).click(),
  ])
  await popup.waitForLoadState()
  await popup.getByRole('button', { name: /Add new account/i }).click()
  await popup.locator('#email-input').fill(`${usuario.replace('.', '-')}@example.com`)
  await popup.locator('#display-name-input').fill(nombre)
  const boton = popup.locator('#sign-in')
  console.log('[popup] sign-in deshabilitado:', await boton.isDisabled())
  await boton.click()
  await page.waitForURL(/\/(registro|app)/, { timeout: 20000 })
  if (page.url().includes('/registro')) {
    await page.getByLabel('Nombre de usuario').fill(usuario)
    for (const casilla of await page.locator('label:has(input[type=checkbox])').all()) await casilla.click()
    await page.getByRole('button', { name: /Crear mi cuenta/i }).click()
    await page.waitForURL(/\/app/, { timeout: 20000 })
  }
}

const navegador = await chromium.launch()
try {
  // 1. Entrar con Google (emulador)
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await entrarConGoogle(page, 'Carlos Prueba', 'carlos.prueba')
  const yo = (await cuentas())[0]
  if (!yo?.localId) falla('1. Login', 'no apareció la cuenta en el emulador de Auth')
  if (!(await docFs(`usuarios/${yo.localId}`))) falla('1. Login', 'no se creó usuarios/{uid}')
  await page.screenshot({ path: `${DIR}/1-login.png` })
  ok('1. Login con Google', `cuenta ${yo.localId} creada y perfil usuarios/{uid} en Firestore`)

  // 2. Sembrar y recargar
  const salida = execFileSync('node', ['scripts/sembrar.ts', `--uid=${yo.localId}`], { encoding: 'utf8' })
  await page.goto(`${APP}/app/servidores`)
  await page.getByText('Estudio de Diseño').first().waitFor({ timeout: 20000 })
  await page.screenshot({ path: `${DIR}/2-servidores.png` })
  ok('2. Sembrar y recargar', `${salida.trim()} — «Estudio de Diseño» aparece en Tus servidores`)

  // 3. Ascender a Sofía a admin, recargar y comprobar
  await page.goto(`${APP}/app/s/estudio-diseno/ajustes/miembros`)
  const selector = page.getByRole('combobox', { name: /Rol de Sofía/i })
  await selector.waitFor({ timeout: 20000 })
  await selector.selectOption('admin')
  await page.waitForTimeout(2500)
  await page.reload()
  const tras = page.getByRole('combobox', { name: /Rol de Sofía/i })
  await tras.waitFor({ timeout: 20000 })
  const valorUi = await tras.inputValue()
  const rolFs = (await docFs('servidores/estudio-diseno/miembros/u-sofia'))?.rol?.stringValue
  await page.screenshot({ path: `${DIR}/3-miembros.png` })
  if (valorUi !== 'admin' || rolFs !== 'admin') falla('3. Ascender', `UI=${valorUi}, Firestore=${rolFs}`)
  ok('3. Ascender a un miembro', 'Sofía queda como admin tras recargar (UI y Firestore)')

  // 4. Unirse con la invitación de Arte Digital
  await page.goto(`${APP}/app/unirse`)
  await page.getByLabel('Enlace o código de invitación').fill('talkwith.app/i/arte-digital-5mz8')
  await page.getByText(/Invitación válida/i).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /Unirme al servidor/i }).click()
  await page.waitForURL(/\/app\/s\/arte-digital/, { timeout: 20000 })
  const nuevo = await docFs(`servidores/arte-digital/miembros/${yo.localId}`)
  await page.screenshot({ path: `${DIR}/4-unirse.png` })
  if (nuevo?.rol?.stringValue !== 'miembro') falla('4. Unirse', `miembro en Firestore: ${JSON.stringify(nuevo)}`)
  ok('4. Unirse con invitación', 'entra a Arte Digital como miembro y el doc existe en Firestore')

  // 5. Segunda cuenta sin datos sembrados
  const ctx2 = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
  const page2 = await ctx2.newPage()
  await entrarConGoogle(page2, 'Ajeno Prueba', 'ajeno.prueba')
  await page2.goto(`${APP}/app/servidores`)
  await page2.waitForTimeout(4000)
  const veServidores = await page2.getByText(/Estudio de Diseño|Arte Digital|Club de Lectura/).count()
  await page2.screenshot({ path: `${DIR}/5a-ajeno-servidores.png` })
  await page2.goto(`${APP}/app/s/estudio-diseno/ajustes/miembros`)
  await page2.waitForTimeout(4000)
  const veMiembros = await page2.getByRole('combobox', { name: /Rol de/i }).count() + await page2.getByText('Sofía').count()
  await page2.screenshot({ path: `${DIR}/5b-ajeno-directo.png` })
  if (veServidores || veMiembros) falla('5. Cuenta ajena', `ve servidores=${veServidores}, miembros=${veMiembros}`)
  ok('5. Cuenta ajena', `no ve servidores ajenos y entrar directo a estudio-diseno no muestra datos (${page2.url().replace(APP, '')})`)
} catch (e) {
  for (const [i, p] of navegador.contexts().flatMap((c) => c.pages()).entries()) {
    await p.screenshot({ path: `${DIR}/error-${i}.png` }).catch(() => {})
    console.log(`--- página ${i}: ${p.url()}\n` + (await p.locator('body').innerText().catch(() => '')).slice(0, 1500))
  }
  console.error(e)
  process.exitCode = 1
} finally {
  await navegador.close()
  console.log('\nRESUMEN\n' + resultados.join('\n'))
}
