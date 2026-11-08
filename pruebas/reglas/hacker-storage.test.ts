import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { getBytes, ref, uploadString } from 'firebase/storage'
import { describe, it } from 'vitest'
import { como, fs, prepararEntorno, st } from './entorno.ts'

/** Ataques del Hacker contra Storage (hack-round-1). */
const entorno = prepararEntorno()
const storage = (uid: string) => st(como(entorno(), uid))
const subir = (uid: string, ruta: string, tipo = 'audio/webm') =>
  uploadString(ref(storage(uid), ruta), 'datos', 'raw', { contentType: tipo })

describe('hacker: Storage', () => {
  it('un miembro de B no sube a la ruta de A aunque tenga consentimiento en su propia sesión', async () => {
    await assertSucceeds(setDoc(doc(fs(como(entorno(), 'bruno')), 'servidores/B/sesiones/s1/consentimientos/bruno'), {
      uid: 'bruno', sesionId: 's1', estado: 'aceptado', actualizadoEn: serverTimestamp(),
    }))
    await assertSucceeds(subir('bruno', 'grabaciones/B/s1/propia.webm'))
    await assertFails(subir('bruno', 'grabaciones/A/s1/ajena.webm'))
  })

  it('tipos que no son audio o rutas fuera del esquema se rechazan', async () => {
    await assertFails(subir('ana', 'grabaciones/A/s1/x.bin', 'application/octet-stream'))
    await assertFails(subir('ana', 'grabaciones/A/s1/x.svg', 'image/svg+xml'))
    await assertFails(subir('ana', 'grabaciones/A/s1/sub/x.webm'))
    await assertFails(subir('ana', 'grabaciones/A/x.webm'))
  })

  it('un miembro retirado pierde la lectura', async () => {
    await assertSucceeds(deleteDoc(doc(fs(como(entorno(), 'luis')), 'servidores/A/miembros/luis')))
    await assertFails(getBytes(ref(storage('luis'), 'grabaciones/A/s1/r1.webm')))
  })

  it('al borrar el servidor, ni el propietario lee el archivo huérfano', async () => {
    const c = fs(como(entorno(), 'dueno'))
    const lote = writeBatch(c)
    lote.delete(doc(c, 'servidores/A'))
    lote.set(doc(c, 'servidoresEliminados/A'), { eliminadoEn: serverTimestamp() })
    await assertSucceeds(lote.commit())
    await assertFails(getBytes(ref(storage('dueno'), 'grabaciones/A/s1/r1.webm')))
    await assertFails(getBytes(ref(storage('ana'), 'grabaciones/A/s1/r1.webm')))
  })
})
