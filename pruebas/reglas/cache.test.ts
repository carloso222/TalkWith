import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { como, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()

/**
 * [DoD-16] Las consultas exactas de `src/services/firestore/escuchas.ts` (la caché de la app):
 * mis membresías (collectionGroup + where uid), y por servidor su documento, miembros y canales,
 * más el perfil de cada co-miembro.
 */
describe('[DoD-16] consultas de la caché de la app', () => {
  const misMembresias = (db: ReturnType<typeof fs>, uid: string) =>
    getDocs(query(collectionGroup(db, 'miembros'), where('uid', '==', uid)))

  it('un miembro lista las membresías propias con collectionGroup + where uid', async () => {
    const snap = await assertSucceeds(misMembresias(fs(como(entorno(), 'ana')), 'ana'))
    expect(snap.docs.map((d) => d.data().servidorId)).toEqual(['A'])
  })

  it('collectionGroup(miembros) sin where se rechaza, y con el uid de otra persona también', async () => {
    const db = fs(como(entorno(), 'ana'))
    await assertFails(getDocs(collectionGroup(db, 'miembros')))
    await assertFails(misMembresias(db, 'luis'))
  })

  it('una persona sin servidores obtiene una lista vacía, no un error', async () => {
    const snap = await assertSucceeds(misMembresias(fs(como(entorno(), 'forastero')), 'forastero'))
    expect(snap.empty).toBe(true)
  })

  it('un miembro lee el servidor y lista sus miembros y canales', async () => {
    const db = fs(como(entorno(), 'ana'))
    await assertSucceeds(getDoc(doc(db, 'servidores/A')))
    const miembros = await assertSucceeds(getDocs(collection(db, 'servidores/A/miembros')))
    expect(miembros.size).toBe(5)
    const canales = await assertSucceeds(getDocs(collection(db, 'servidores/A/canales')))
    expect(canales.docs.map((d) => d.id)).toEqual(['general'])
  })

  it('un forastero no lee el servidor ni lista sus miembros o canales', async () => {
    const db = fs(como(entorno(), 'forastero'))
    await assertFails(getDoc(doc(db, 'servidores/A')))
    await assertFails(getDocs(collection(db, 'servidores/A/miembros')))
    await assertFails(getDocs(collection(db, 'servidores/A/canales')))
  })

  it('un miembro de otro servidor tampoco ve el servidor A', async () => {
    const db = fs(como(entorno(), 'bruno'))
    await assertFails(getDocs(collection(db, 'servidores/A/miembros')))
    await assertFails(getDocs(collection(db, 'servidores/A/canales')))
  })

  it('tras borrar el miembro de ana, ana ya no lee el servidor, sus canales ni sus miembros', async () => {
    const db = fs(como(entorno(), 'ana'))
    await assertSucceeds(getDocs(collection(db, 'servidores/A/canales')))
    await assertSucceeds(deleteDoc(doc(fs(como(entorno(), 'dueno')), 'servidores/A/miembros/ana')))
    await assertFails(getDoc(doc(db, 'servidores/A')))
    await assertFails(getDocs(collection(db, 'servidores/A/canales')))
    await assertFails(getDocs(collection(db, 'servidores/A/miembros')))
    const snap = await assertSucceeds(misMembresias(db, 'ana'))
    expect(snap.empty).toBe(true)
  })

  it('el perfil de un co-miembro se lee; sin sesión no', async () => {
    await assertSucceeds(getDoc(doc(fs(como(entorno(), 'luis')), 'usuarios/ana')))
    await assertFails(getDoc(doc(fs(entorno().unauthenticatedContext()), 'usuarios/ana')))
  })

  it('las invitaciones se leen por código pero no se listan', async () => {
    const db = fs(como(entorno(), 'forastero'))
    await assertSucceeds(getDoc(doc(db, 'invitaciones/invitacion-valida-001')))
    await assertFails(getDocs(collection(db, 'invitaciones')))
  })
})
