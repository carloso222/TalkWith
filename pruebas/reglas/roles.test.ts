import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()
const miembro = (uid: string) => `servidores/A/miembros/${uid}`
const editar = (quien: string, objetivo: string, cambios: Record<string, unknown>) =>
  updateDoc(doc(fs(como(entorno(), quien)), miembro(objetivo)), cambios)

describe('[DoD-15] roles', () => {
  it('un miembro no se asigna admin a sí mismo', async () => {
    await assertFails(editar('ana', 'ana', { rol: 'admin' }))
    await assertFails(editar('ana', 'ana', { rol: 'propietario' }))
  })

  it('un admin no edita su propio rol', async () => {
    await assertFails(editar('admin', 'admin', { rol: 'miembro' }))
    await assertFails(editar('admin', 'admin', { rol: 'propietario' }))
  })

  it('el propietario asciende a un miembro a admin', async () => {
    await assertSucceeds(editar('dueno', 'ana', { rol: 'admin' }))
  })

  it('un admin no asciende a otro', async () => {
    await assertFails(editar('admin', 'luis', { rol: 'admin' }))
    await assertFails(editar('admin', 'admin2', { rol: 'miembro' }))
  })

  it('nadie puede poner rol propietario por update', async () => {
    await assertFails(editar('dueno', 'ana', { rol: 'propietario' }))
    await assertFails(editar('admin', 'ana', { rol: 'propietario' }))
    await assertFails(editar('ana', 'luis', { rol: 'propietario' }))
  })

  it('el propietario no cambia su propio rol', async () => {
    await assertFails(editar('dueno', 'dueno', { rol: 'admin' }))
  })

  it('un admin cambia el grupo de un miembro pero no el de un propietario', async () => {
    await assertSucceeds(editar('admin', 'ana', { grupo: 'Diseño' }))
    await assertFails(editar('admin', 'dueno', { grupo: 'Diseño' }))
  })

  it('un miembro no edita a otros', async () => {
    await assertFails(editar('ana', 'luis', { grupo: 'Diseño' }))
  })
})

describe('retirar miembros', () => {
  const retirar = (quien: string, objetivo: string) => deleteDoc(doc(fs(como(entorno(), quien)), miembro(objetivo)))

  it('un miembro puede salir, el propietario no', async () => {
    await assertSucceeds(retirar('ana', 'ana'))
    await assertFails(retirar('dueno', 'dueno'))
  })

  it('un miembro no retira a otros', async () => {
    await assertFails(retirar('ana', 'luis'))
  })

  it('el propietario retira a admins y miembros; el admin solo a miembros', async () => {
    await assertSucceeds(retirar('dueno', 'admin2'))
    await assertSucceeds(retirar('admin', 'luis'))
    await assertFails(retirar('admin', 'admin2'))
    await assertFails(retirar('admin', 'dueno'))
  })
})

describe('[DoD-16] eliminar el servidor', () => {
  // Borrar el servidor exige un batch que también crea la lápida `servidoresEliminados/A`.
  const borrar = (quien: string) => {
    const c = fs(como(entorno(), quien))
    const lote = writeBatch(c)
    lote.delete(doc(c, 'servidores/A'))
    lote.set(doc(c, 'servidoresEliminados/A'), { eliminadoEn: serverTimestamp() })
    return lote.commit()
  }

  it('un miembro no lo borra', async () => {
    await assertFails(borrar('ana'))
  })

  it('un admin no lo borra', async () => {
    await assertFails(borrar('admin'))
  })

  it('el propietario sí', async () => {
    await assertSucceeds(borrar('dueno'))
  })
})

describe('editar el servidor y los canales', () => {
  it('un admin edita el servidor pero no su propietario', async () => {
    const db = fs(como(entorno(), 'admin'))
    await assertSucceeds(updateDoc(doc(db, 'servidores/A'), { nombre: 'Estudio A2' }))
    await assertFails(updateDoc(doc(db, 'servidores/A'), { propietarioUid: 'admin' }))
  })

  it('un miembro no edita el servidor ni crea canales', async () => {
    const db = fs(como(entorno(), 'ana'))
    await assertFails(updateDoc(doc(db, 'servidores/A'), { nombre: 'Otro' }))
    await assertFails(updateDoc(doc(db, 'servidores/A/canales/general'), { nombre: 'otro' }))
  })

  it('un admin edita un canal', async () => {
    await assertSucceeds(updateDoc(doc(fs(como(entorno(), 'admin')), 'servidores/A/canales/general'), { nombre: 'principal' }))
  })
})
