import { assertFails } from '@firebase/rules-unit-testing'
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, enUnaHora, fs, prepararEntorno } from './entorno.ts'

/** Ataques del Hacker (hack-round-1) que las reglas ya bloquean: quedan como regresión. */
const entorno = prepararEntorno()
const db = (uid: string) => fs(como(entorno(), uid))
const s1 = 'servidores/A/sesiones/s1'

describe('hacker: lectura sin membresía', () => {
  it('un no miembro no lee sesiones, segmentos, consentimientos ni grabaciones', async () => {
    for (const uid of ['forastero', 'bruno']) {
      await assertFails(getDoc(doc(db(uid), s1)))
      await assertFails(getDoc(doc(db(uid), `${s1}/segmentos/g1`)))
      await assertFails(getDoc(doc(db(uid), `${s1}/consentimientos/ana`)))
      await assertFails(getDocs(collection(db(uid), `${s1}/grabaciones`)))
      await assertFails(getDocs(collection(db(uid), 'servidores/A/miembros')))
    }
  })

  it('collectionGroup sin filtro o con servidorId ajeno se rechaza', async () => {
    await assertFails(getDocs(collectionGroup(db('bruno'), 'mensajes')))
    await assertFails(getDocs(query(collectionGroup(db('bruno'), 'segmentos'), where('servidorId', '==', 'A'))))
    await assertFails(getDocs(query(collectionGroup(db('bruno'), 'miembros'), where('servidorId', '==', 'A'))))
  })

  it('un miembro de B no siembra un mensaje con servidorId A para colarlo en la búsqueda de A', async () => {
    await assertFails(setDoc(doc(db('bruno'), 'servidores/B/canales/general/mensajes/x'), {
      servidorId: 'A', canalId: 'general', autorUid: 'bruno', contenido: 'x', creadoEn: serverTimestamp(), terminos: [],
    }))
  })

  it('sin sesión no se escribe nada', async () => {
    const anonimo = fs(entorno().unauthenticatedContext())
    await assertFails(getDoc(doc(anonimo, 'nombresUsuario/ana.p')))
    await assertFails(setDoc(doc(anonimo, 'nombresUsuario/libre.x'), { uid: 'x' }))
    await assertFails(getDoc(doc(anonimo, s1)))
  })
})

describe('hacker: escalar rol', () => {
  it('un miembro no se sube el rol ni agrega campos a su doc', async () => {
    await assertFails(setDoc(doc(db('ana'), 'servidores/A/miembros/ana'), { rol: 'admin' }, { merge: true }))
    await assertFails(updateDoc(doc(db('ana'), 'servidores/A/miembros/ana'), { admin: true }))
    await assertFails(updateDoc(doc(db('ana'), 'servidores/A/miembros/ana'), { grupo: 'x' }))
  })

  it('un admin no agrega campos inesperados ni cambia el uid de otro', async () => {
    await assertFails(updateDoc(doc(db('admin'), 'servidores/A/miembros/ana'), { grupo: 'x', rol: 'admin' }))
    await assertFails(updateDoc(doc(db('admin'), 'servidores/A/miembros/ana'), { uid: 'admin' }))
  })

  it('rol con tipo raro (lista o mapa) se rechaza', async () => {
    await assertFails(updateDoc(doc(db('dueno'), 'servidores/A/miembros/ana'), { rol: ['admin'] }))
    await assertFails(updateDoc(doc(db('dueno'), 'servidores/A/miembros/ana'), { rol: { admin: true } }))
  })

  it('el propietario no cambia el uid ni el servidorId de un miembro', async () => {
    await assertFails(updateDoc(doc(db('dueno'), 'servidores/A/miembros/ana'), { uid: 'luis' }))
  })

  it('unirse con campos extra o con rol propietario en un servidor existente se rechaza', async () => {
    const base = { uid: 'forastero', servidorId: 'A', rol: 'miembro', unidoEn: serverTimestamp(), correo: 'forastero@test.com', codigoInvitacion: 'invitacion-valida-001' }
    await assertFails(setDoc(doc(db('forastero'), 'servidores/A/miembros/forastero'), { ...base, grupo: 'Admins' }))
    await assertFails(setDoc(doc(db('forastero'), 'servidores/A/miembros/forastero'), { ...base, codigoInvitacion: ['invitacion-valida-001'] }))
  })

  it('batch mixto: servidor nuevo con propietarioUid ajeno y miembro propietario propio se rechaza', async () => {
    const c = db('forastero')
    const lote = writeBatch(c)
    lote.set(doc(c, 'servidores/F'), {
      nombre: 'Servidor F', descripcion: '', iniciales: 'SF', color: 'indigo', propietarioUid: 'dueno', privacidad: 'invitacion', creadoEn: serverTimestamp(),
    })
    lote.set(doc(c, 'servidores/F/miembros/forastero'), {
      uid: 'forastero', servidorId: 'F', rol: 'propietario', unidoEn: serverTimestamp(), correo: 'forastero@test.com',
    })
    await assertFails(lote.commit())
  })

  it('batch: ser propietario de un servidor nuevo no permite crear invitaciones de otro', async () => {
    const c = db('forastero')
    const lote = writeBatch(c)
    lote.set(doc(c, 'servidores/G'), {
      nombre: 'Servidor G', descripcion: '', iniciales: 'SG', color: 'indigo', propietarioUid: 'forastero', privacidad: 'invitacion', creadoEn: serverTimestamp(),
    })
    lote.set(doc(c, 'servidores/G/miembros/forastero'), {
      uid: 'forastero', servidorId: 'G', rol: 'propietario', unidoEn: serverTimestamp(), correo: 'forastero@test.com',
    })
    lote.set(doc(c, 'invitaciones/robada-para-a-0001'), {
      servidorId: 'A', invitaUid: 'forastero', creadaEn: serverTimestamp(), expiraEn: enUnaHora(),
      servidorNombre: 'Estudio A', servidorIniciales: 'ES', servidorColor: 'indigo',
    })
    await assertFails(lote.commit())
  })

  it('un admin no borra invitaciones de otro servidor ni un miembro las de su servidor', async () => {
    await assertFails(deleteDoc(doc(db('duenoB'), 'invitaciones/invitacion-valida-001')))
    await assertFails(deleteDoc(doc(db('ana'), 'invitaciones/invitacion-valida-001')))
  })

  it('nadie edita una invitación para alargar su vigencia', async () => {
    await assertFails(updateDoc(doc(db('dueno'), 'invitaciones/invitacion-vencida-01'), { expiraEn: enUnaHora() }))
  })
})

describe('hacker: tipos y tamaños', () => {
  it('textos fuera de rango se rechazan', async () => {
    await assertFails(setDoc(doc(db('ana'), 'servidores/A/canales/general/mensajes/largo'), {
      servidorId: 'A', canalId: 'general', autorUid: 'ana', contenido: 'x'.repeat(4001), creadoEn: serverTimestamp(), terminos: [],
    }))
    await assertFails(updateDoc(doc(db('ana'), 'usuarios/ana'), { nombre: 'x'.repeat(65), actualizadoEn: serverTimestamp() }))
    await assertFails(updateDoc(doc(db('ana'), 'usuarios/ana'), { nombre: ['Ana'], actualizadoEn: serverTimestamp() }))
  })

  it('un mensaje sin campos obligatorios o con terminos que no es lista se rechaza', async () => {
    const ruta = 'servidores/A/canales/general/mensajes/raro'
    await assertFails(setDoc(doc(db('ana'), ruta), { servidorId: 'A', canalId: 'general', autorUid: 'ana', contenido: 'x', creadoEn: serverTimestamp() }))
    await assertFails(setDoc(doc(db('ana'), ruta), { servidorId: 'A', canalId: 'general', autorUid: 'ana', contenido: 'x', creadoEn: serverTimestamp(), terminos: 'x' }))
  })
})
