import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, Timestamp,
  updateDoc, where, writeBatch, type Firestore,
} from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { como, enUnaHora, fs, prepararEntorno } from './entorno.ts'

/** Hacker, run 20261108-fase2-datos-tw07 (hack-round-1). */
const entorno = prepararEntorno()
const db = (uid: string) => fs(como(entorno(), uid))
const DIA = 24 * 3_600_000

const invitacionDeA = (invitaUid: string, expiraEn: Timestamp) => ({
  servidorId: 'A', invitaUid, creadaEn: serverTimestamp(), expiraEn,
  servidorNombre: 'Estudio A', servidorIniciales: 'ES', servidorColor: 'indigo',
})

const unirse = (c: Firestore, uid: string, codigo: string) =>
  setDoc(doc(c, `servidores/A/miembros/${uid}`), {
    uid, servidorId: 'A', rol: 'miembro', unidoEn: serverTimestamp(), correo: `${uid}@test.com`, codigoInvitacion: codigo,
  })

describe('S1 invitaciones sin límite de vigencia (puerta trasera tras retirar a un admin)', () => {
  it('un gestor no crea una invitación que vence en más de 8 días', async () => {
    const lejana = Timestamp.fromMillis(Date.now() + 100 * 365 * DIA)
    await assertFails(setDoc(doc(db('admin'), 'invitaciones/puerta-trasera-0001'), invitacionDeA('admin', lejana)))
    await assertFails(setDoc(doc(db('admin'), 'invitaciones/puerta-trasera-0002'), invitacionDeA('admin', Timestamp.fromMillis(Date.now() + 9 * DIA))))
  })

  it('la vigencia normal de la app (7 días) se sigue permitiendo', async () => {
    await assertSucceeds(setDoc(doc(db('admin'), 'invitaciones/siete-dias-00001'), invitacionDeA('admin', Timestamp.fromMillis(Date.now() + 7 * DIA))))
  })
})

describe('riesgo aceptado: volver a entrar con un código vigente después de ser retirado', () => {
  it('un miembro retirado vuelve con la invitación vigente (acotado a ≤ 8 días; el gestor puede borrarla)', async () => {
    await assertSucceeds(deleteDoc(doc(db('dueno'), 'servidores/A/miembros/ana')))
    await assertSucceeds(unirse(db('ana'), 'ana', 'invitacion-valida-001'))
    // Mitigación disponible: un gestor que conoce el código lo borra y ya no sirve.
    await assertSucceeds(deleteDoc(doc(db('dueno'), 'servidores/A/miembros/ana')))
    await assertSucceeds(deleteDoc(doc(db('dueno'), 'invitaciones/invitacion-valida-001')))
    await assertFails(unirse(db('ana'), 'ana', 'invitacion-valida-001'))
  })
})

describe('unirse: variantes que debe rechazar la regla', () => {
  it('rol admin, correo ajeno, claves extra o uid ajeno se rechazan', async () => {
    const c = db('nuevo')
    const base = { uid: 'nuevo', servidorId: 'A', rol: 'miembro', unidoEn: serverTimestamp(), correo: 'nuevo@test.com', codigoInvitacion: 'invitacion-valida-001' }
    const ruta = doc(c, 'servidores/A/miembros/nuevo')
    await assertFails(setDoc(ruta, { ...base, rol: 'admin' }))
    await assertFails(setDoc(ruta, { ...base, correo: 'dueno@test.com' }))
    await assertFails(setDoc(ruta, { ...base, grupo: 'Coordinación' }))
    await assertFails(setDoc(ruta, { ...base, codigoInvitacion: 'invitacion-vencida-01' }))
    await assertFails(setDoc(doc(c, 'servidores/A/miembros/forastero'), { ...base, uid: 'forastero', correo: 'forastero@test.com' }))
    await assertSucceeds(setDoc(ruta, base))
  })
})

describe('roles: casos del Hacker', () => {
  const editar = (quien: string, objetivo: string, cambios: Record<string, unknown>) =>
    updateDoc(doc(db(quien), `servidores/A/miembros/${objetivo}`), cambios)
  const retirar = (quien: string, objetivo: string) => deleteDoc(doc(db(quien), `servidores/A/miembros/${objetivo}`))

  it('nadie retira al propietario; un admin no retira a otro admin ni cambia rol', async () => {
    await assertFails(retirar('admin', 'dueno'))
    await assertFails(retirar('ana', 'dueno'))
    await assertFails(retirar('admin', 'admin2'))
    await assertFails(editar('admin', 'luis', { rol: 'admin' }))
    await assertFails(editar('admin', 'admin2', { rol: 'miembro' }))
  })

  it('el propietario no se degrada ni se retira', async () => {
    await assertFails(editar('dueno', 'dueno', { rol: 'miembro' }))
    await assertFails(retirar('dueno', 'dueno'))
  })

  it('un cambio de rol rechazado se revierte en la caché local (compensación de latencia)', async () => {
    const c = db('ana')
    const vistos: string[] = []
    let resolver: () => void = () => {}
    const revertido = new Promise<void>((r) => { resolver = r })
    const cancelar = onSnapshot(doc(c, 'servidores/A/miembros/ana'), { includeMetadataChanges: true }, (s) => {
      const rol = s.data()?.rol as string
      vistos.push(rol)
      if (vistos.includes('admin') && rol === 'miembro' && !s.metadata.hasPendingWrites) resolver()
    })
    await new Promise((r) => setTimeout(r, 300))
    await assertFails(updateDoc(doc(c, 'servidores/A/miembros/ana'), { rol: 'admin' }))
    await Promise.race([revertido, new Promise((r) => setTimeout(r, 5000))])
    cancelar()
    expect(vistos.at(-1)).toBe('miembro')
  })
})

describe('canales: un miembro raso no los gestiona', () => {
  it('crear, editar y borrar como miembro se rechaza', async () => {
    const c = db('ana')
    await assertFails(setDoc(doc(c, 'servidores/A/canales/nuevo-x1'), { servidorId: 'A', nombre: 'nuevo', tipo: 'texto' }))
    await assertFails(setDoc(doc(c, 'servidores/A/canales/general'), { servidorId: 'A', nombre: 'otro', tipo: 'texto' }))
    await assertFails(deleteDoc(doc(c, 'servidores/A/canales/general')))
  })
})

describe('miembro huérfano de un servidor con lápida', () => {
  it('la membresía sigue saliendo en mi consulta, pero el servidor, sus miembros y canales no se leen', async () => {
    const dueno = db('dueno')
    const lote = writeBatch(dueno)
    lote.delete(doc(dueno, 'servidores/A'))
    lote.set(doc(dueno, 'servidoresEliminados/A'), { eliminadoEn: serverTimestamp() })
    await assertSucceeds(lote.commit())
    const c = db('ana')
    const mias = await assertSucceeds(getDocs(query(collectionGroup(c, 'miembros'), where('uid', '==', 'ana'))))
    expect(mias.docs.map((d) => d.data().servidorId)).toEqual(['A'])
    await assertFails(getDoc(doc(c, 'servidores/A')))
    await assertFails(getDocs(collection(c, 'servidores/A/miembros')))
    await assertFails(getDocs(collection(c, 'servidores/A/canales')))
  })
})

it('control: una invitación de una hora sigue funcionando', async () => {
  await assertSucceeds(setDoc(doc(db('dueno'), 'invitaciones/una-hora-000001'), invitacionDeA('dueno', enUnaHora())))
})
