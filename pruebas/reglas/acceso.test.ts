import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { getBytes, ref, uploadString } from 'firebase/storage'
import { describe, expect, it } from 'vitest'
import { como, fs, prepararEntorno, st } from './entorno.ts'

const entorno = prepararEntorno()

describe('[DoD-13] sin autenticación todo se rechaza', () => {
  it('no lee usuarios, servidores, invitaciones ni mensajes', async () => {
    const db = fs(entorno().unauthenticatedContext())
    await assertFails(getDoc(doc(db, 'usuarios/ana')))
    await assertFails(getDoc(doc(db, 'servidores/A')))
    await assertFails(getDoc(doc(db, 'invitaciones/invitacion-valida-001')))
    await assertFails(getDocs(collection(db, 'servidores/A/canales/general/mensajes')))
    await assertFails(getDoc(doc(db, 'servidores/A/canales/general/mensajes/m1')))
  })

  it('no lee ni escribe en Storage', async () => {
    const storage = st(entorno().unauthenticatedContext())
    await assertFails(getBytes(ref(storage, 'grabaciones/A/s1/r1.webm')))
    await assertFails(uploadString(ref(storage, 'grabaciones/A/s1/otro.webm'), 'x', 'raw', { contentType: 'audio/webm' }))
  })
})

describe('[DoD-14] lectura de mensajes por membresía', () => {
  const mensajes = 'servidores/A/canales/general/mensajes'

  it('un no miembro no lee los mensajes del canal', async () => {
    const db = fs(como(entorno(), 'forastero'))
    await assertFails(getDoc(doc(db, `${mensajes}/m1`)))
    await assertFails(getDocs(collection(db, mensajes)))
  })

  it('un miembro de otro servidor tampoco', async () => {
    await assertFails(getDoc(doc(fs(como(entorno(), 'bruno')), `${mensajes}/m1`)))
  })

  it('un miembro sí los lee', async () => {
    const db = fs(como(entorno(), 'ana'))
    await assertSucceeds(getDoc(doc(db, `${mensajes}/m1`)))
    await assertSucceeds(getDocs(collection(db, mensajes)))
  })

  it('collectionGroup de mensajes con servidorId ajeno se rechaza', async () => {
    const consulta = (uid: string, servidorId: string) =>
      getDocs(query(collectionGroup(fs(como(entorno(), uid)), 'mensajes'), where('servidorId', '==', servidorId)))
    await assertFails(consulta('forastero', 'A'))
    await assertFails(consulta('bruno', 'A'))
    const propios = await assertSucceeds(consulta('ana', 'A'))
    expect(propios.size).toBe(1)
  })
})

describe('[DoD-22] metadatos de grabaciones de otro servidor', () => {
  const ruta = 'servidores/A/sesiones/s1/grabaciones/r1'

  it('lectura directa: miembro sí, de otro servidor no', async () => {
    await assertSucceeds(getDoc(doc(fs(como(entorno(), 'ana')), ruta)))
    await assertFails(getDoc(doc(fs(como(entorno(), 'bruno')), ruta)))
    await assertFails(getDoc(doc(fs(como(entorno(), 'forastero')), ruta)))
  })

  it('collectionGroup: miembro sí, de otro servidor no', async () => {
    const consulta = (uid: string) =>
      getDocs(query(collectionGroup(fs(como(entorno(), uid)), 'grabaciones'), where('servidorId', '==', 'A')))
    await assertSucceeds(consulta('ana'))
    await assertFails(consulta('bruno'))
  })
})

describe('«mis servidores» por collectionGroup de miembros', () => {
  it('solo regresa los miembros propios', async () => {
    const db = fs(como(entorno(), 'ana'))
    await assertSucceeds(getDocs(query(collectionGroup(db, 'miembros'), where('uid', '==', 'ana'))))
    await assertFails(getDocs(query(collectionGroup(db, 'miembros'), where('uid', '==', 'luis'))))
  })
})
