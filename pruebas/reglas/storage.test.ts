import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteObject, getBytes, ref, uploadString } from 'firebase/storage'
import { describe, it } from 'vitest'
import { como, prepararEntorno, st } from './entorno.ts'

const entorno = prepararEntorno()
const storage = (uid: string) => st(como(entorno(), uid))
const subir = (uid: string, archivo: string, tipo: string) =>
  uploadString(ref(storage(uid), `grabaciones/A/s1/${archivo}`), 'datos', 'raw', { contentType: tipo })

describe('[DoD-21] Storage', () => {
  it('un miembro de A lee las grabaciones de A', async () => {
    await assertSucceeds(getBytes(ref(storage('ana'), 'grabaciones/A/s1/r1.webm')))
  })

  it('un miembro de B no lee las grabaciones de A', async () => {
    await assertFails(getBytes(ref(storage('bruno'), 'grabaciones/A/s1/r1.webm')))
    await assertFails(getBytes(ref(storage('forastero'), 'grabaciones/A/s1/r1.webm')))
  })

  it('con consentimiento aceptado se sube audio', async () => {
    await assertSucceeds(subir('ana', 'nueva.webm', 'audio/webm'))
  })

  it('sin consentimiento aceptado no se sube', async () => {
    await assertFails(subir('luis', 'nueva.webm', 'audio/webm'))
    await assertFails(subir('admin', 'nueva.webm', 'audio/webm'))
  })

  it('un contentType que no es audio se rechaza', async () => {
    await assertFails(subir('ana', 'nueva.html', 'text/html'))
  })

  it('un archivo de 100 MB o más se rechaza', async () => {
    const grande = 'x'.repeat(100 * 1024 * 1024)
    await assertFails(uploadString(ref(storage('ana'), 'grabaciones/A/s1/grande.webm'), grande, 'raw', { contentType: 'audio/webm' }))
  })

  it('un archivo existente no se sobrescribe', async () => {
    await assertFails(subir('ana', 'r1.webm', 'audio/webm'))
  })

  it('borra un gestor, no un miembro', async () => {
    await assertFails(deleteObject(ref(storage('ana'), 'grabaciones/A/s1/r1.webm')))
    await assertSucceeds(deleteObject(ref(storage('admin'), 'grabaciones/A/s1/r1.webm')))
  })

  it('cualquier otra ruta está denegada', async () => {
    await assertFails(uploadString(ref(storage('ana'), 'publico/foto.png'), 'x', 'raw', { contentType: 'image/png' }))
  })
})
