/**
 * Sembrado de datos de ejemplo SOLO para el emulador de Firestore (proyecto `demo-*`).
 *
 * Uso:
 *   npm run emuladores            (en otra terminal, y `npm run dev`)
 *   entra con Google en la app, copia tu uid de http://127.0.0.1:4000/auth y ejecuta:
 *   npm run sembrar -- --uid=<uid> [--correo=<correo>]
 *
 * No se importa desde `src/` ni corre en CI. No pisa las reglas que tenga cargadas el emulador.
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { documentosDeEjemplo } from './sembrarDatos.ts'
import { leerArgumentos } from './sembrarArgs.ts'

async function principal(): Promise<void> {
  const { uid, correo, proyecto } = leerArgumentos(process.argv.slice(2), process.env)
  const entorno = await initializeTestEnvironment({ projectId: proyecto, firestore: { host: '127.0.0.1', port: 8080 } })
  try {
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      const db = contexto.firestore() as unknown as Firestore
      if (!(await getDoc(doc(db, 'usuarios', uid))).exists()) {
        throw new Error(`No existe usuarios/${uid}. Inicia sesión primero en la app (con el emulador) y vuelve a intentarlo.`)
      }
      const docs = documentosDeEjemplo(uid, correo, Date.now())
      for (const [ruta, datos] of docs) await setDoc(doc(db, ruta), datos)
      console.log(`Listo: ${docs.length} documentos sembrados en «${proyecto}» para ${uid}.`)
    })
  } finally {
    await entorno.cleanup()
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
