import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()
const db = (uid: string) => fs(como(entorno(), uid))

describe('[DoD-23] usuarios y nombres de usuario', () => {
  const perfilNuevo = () => ({
    nombre: 'Fresco', iniciales: 'FR', color: 'indigo', estado: 'en-linea', creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
  })

  it('cualquier sesión lee un perfil público', async () => {
    await assertSucceeds(getDoc(doc(db('forastero'), 'usuarios/ana')))
  })

  it('el primer login crea el perfil propio sin correo', async () => {
    await assertSucceeds(setDoc(doc(db('fresco'), 'usuarios/fresco'), perfilNuevo()))
  })

  it('el perfil no admite correo ni campos ajenos', async () => {
    await assertFails(setDoc(doc(db('fresco'), 'usuarios/fresco'), { ...perfilNuevo(), correo: 'fresco@test.com' }))
    await assertFails(setDoc(doc(db('fresco'), 'usuarios/fresco'), { ...perfilNuevo(), admin: true }))
  })

  it('escribir el doc de otro uid se rechaza', async () => {
    await assertFails(setDoc(doc(db('fresco'), 'usuarios/ana'), perfilNuevo()))
    await assertFails(updateDoc(doc(db('fresco'), 'usuarios/ana'), { nombre: 'Hackeada', actualizadoEn: serverTimestamp() }))
  })

  it('nadie borra un perfil', async () => {
    await assertFails(deleteDoc(doc(db('ana'), 'usuarios/ana')))
  })

  it('ponerse un usuario sin reservar nombresUsuario se rechaza', async () => {
    await assertFails(updateDoc(doc(db('nuevo'), 'usuarios/nuevo'), { usuario: 'sin.reserva', actualizadoEn: serverTimestamp() }))
  })

  it('ponerse un usuario reservado por otro se rechaza', async () => {
    await assertFails(updateDoc(doc(db('nuevo'), 'usuarios/nuevo'), { usuario: 'ana.p', actualizadoEn: serverTimestamp() }))
  })

  it('reservar un nombre que ya tiene dueño se rechaza', async () => {
    await assertFails(setDoc(doc(db('nuevo'), 'nombresUsuario/ana.p'), { uid: 'nuevo' }))
  })

  it('reservar un nombre a nombre de otro uid o con formato inválido se rechaza', async () => {
    await assertFails(setDoc(doc(db('nuevo'), 'nombresUsuario/libre.uno'), { uid: 'ana' }))
    await assertFails(setDoc(doc(db('nuevo'), 'nombresUsuario/MAYUS'), { uid: 'nuevo' }))
  })

  it('reservar el nombre y completar el perfil en un batch se permite', async () => {
    const cliente = db('nuevo')
    const lote = writeBatch(cliente)
    lote.set(doc(cliente, 'nombresUsuario/nuevo.h'), { uid: 'nuevo' })
    lote.update(doc(cliente, 'usuarios/nuevo'), { usuario: 'nuevo.h', nombre: 'Nuevo H', iniciales: 'NH', actualizadoEn: serverTimestamp() })
    await assertSucceeds(lote.commit())
  })
})
