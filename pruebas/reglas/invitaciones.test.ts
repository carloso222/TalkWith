import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, enUnaHora, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()

const unirse = (uid: string, datos: Record<string, unknown>, destino = uid) =>
  setDoc(doc(fs(como(entorno(), uid)), `servidores/A/miembros/${destino}`), {
    uid: destino,
    servidorId: 'A',
    rol: 'miembro',
    unidoEn: serverTimestamp(),
    correo: `${uid}@test.com`,
    codigoInvitacion: 'invitacion-valida-001',
    ...datos,
  })

describe('[DoD-17] unirse con invitación', () => {
  it('con invitación válida y rol miembro se permite', async () => {
    await assertSucceeds(unirse('forastero', {}))
  })

  it('con rol admin o propietario se rechaza', async () => {
    await assertFails(unirse('forastero', { rol: 'admin' }))
    await assertFails(unirse('forastero', { rol: 'propietario' }))
  })

  it('con un código inexistente se rechaza', async () => {
    await assertFails(unirse('forastero', { codigoInvitacion: 'no-existe-este-codigo' }))
  })

  it('con una invitación expirada se rechaza', async () => {
    await assertFails(unirse('forastero', { codigoInvitacion: 'invitacion-vencida-01' }))
  })

  it('con la invitación de otro servidor se rechaza', async () => {
    await assertFails(
      setDoc(doc(fs(como(entorno(), 'forastero')), 'servidores/B/miembros/forastero'), {
        uid: 'forastero', servidorId: 'B', rol: 'miembro', unidoEn: serverTimestamp(),
        correo: 'forastero@test.com', codigoInvitacion: 'invitacion-valida-001',
      }),
    )
  })

  it('crear el miembro de otro uid se rechaza', async () => {
    await assertFails(unirse('forastero', { uid: 'nuevo' }, 'nuevo'))
  })

  it('con un correo que no es el de la cuenta se rechaza', async () => {
    await assertFails(unirse('forastero', { correo: 'otro@test.com' }))
  })

  it('no se puede listar invitaciones, pero sí leer una con su código', async () => {
    const db = fs(como(entorno(), 'forastero'))
    await assertFails(getDocs(collection(db, 'invitaciones')))
    await assertSucceeds(getDoc(doc(db, 'invitaciones/invitacion-valida-001')))
  })
})

describe('administrar invitaciones', () => {
  const nueva = (servidorId = 'A') => ({
    servidorId, invitaUid: 'dueno', creadaEn: serverTimestamp(), expiraEn: enUnaHora(),
    servidorNombre: 'Estudio A', servidorIniciales: 'ES', servidorColor: 'indigo',
  })

  it('un gestor crea una invitación; un miembro no', async () => {
    await assertSucceeds(setDoc(doc(fs(como(entorno(), 'dueno')), 'invitaciones/codigo-nuevo-0001'), nueva()))
    await assertFails(setDoc(doc(fs(como(entorno(), 'ana')), 'invitaciones/codigo-nuevo-0002'), { ...nueva(), invitaUid: 'ana' }))
  })

  it('el código corto se rechaza', async () => {
    await assertFails(setDoc(doc(fs(como(entorno(), 'dueno')), 'invitaciones/corto'), nueva()))
  })
})

describe('[DoD-18] arranque del servidor', () => {
  const arranque = (db: ReturnType<typeof fs>, extra = false) => {
    const lote = writeBatch(db)
    lote.set(doc(db, 'servidores/C'), {
      nombre: 'Servidor C', descripcion: '', iniciales: 'SC', color: 'indigo',
      propietarioUid: 'nuevo', privacidad: 'invitacion', creadoEn: serverTimestamp(),
    })
    lote.set(doc(db, 'servidores/C/miembros/nuevo'), {
      uid: 'nuevo', servidorId: 'C', rol: 'propietario', unidoEn: serverTimestamp(), correo: 'nuevo@test.com',
    })
    if (extra) {
      lote.set(doc(db, 'servidores/C/canales/general'), { servidorId: 'C', nombre: 'general', tipo: 'texto' })
      lote.set(doc(db, 'invitaciones/servidor-c-codigo-01'), {
        servidorId: 'C', invitaUid: 'nuevo', creadaEn: serverTimestamp(), expiraEn: enUnaHora(),
        servidorNombre: 'Servidor C', servidorIniciales: 'SC', servidorColor: 'indigo',
      })
    }
    return lote.commit()
  }

  it('un batch con servidor y miembro propietario del creador se permite', async () => {
    await assertSucceeds(arranque(fs(como(entorno(), 'nuevo'))))
  })

  it('el batch completo (canales e invitación) se permite', async () => {
    await assertSucceeds(arranque(fs(como(entorno(), 'nuevo')), true))
  })

  it('crear un miembro propietario en un servidor que ya existe se rechaza', async () => {
    await assertFails(
      setDoc(doc(fs(como(entorno(), 'forastero')), 'servidores/A/miembros/forastero'), {
        uid: 'forastero', servidorId: 'A', rol: 'propietario', unidoEn: serverTimestamp(), correo: 'forastero@test.com',
      }),
    )
  })

  it('un servidor a nombre de otro uid se rechaza', async () => {
    const db = fs(como(entorno(), 'forastero'))
    await assertFails(
      setDoc(doc(db, 'servidores/D'), {
        nombre: 'Servidor D', descripcion: '', iniciales: 'SD', color: 'indigo',
        propietarioUid: 'dueno', privacidad: 'invitacion', creadoEn: serverTimestamp(),
      }),
    )
  })

  it('batch mixto: ser propietario de un servidor nuevo no da permisos en otro', async () => {
    const db = fs(como(entorno(), 'forastero'))
    const lote = writeBatch(db)
    lote.set(doc(db, 'servidores/E'), {
      nombre: 'Servidor E', descripcion: '', iniciales: 'SE', color: 'indigo',
      propietarioUid: 'forastero', privacidad: 'invitacion', creadoEn: serverTimestamp(),
    })
    lote.set(doc(db, 'servidores/E/miembros/forastero'), {
      uid: 'forastero', servidorId: 'E', rol: 'propietario', unidoEn: serverTimestamp(), correo: 'forastero@test.com',
    })
    lote.set(doc(db, 'servidores/A/canales/intruso'), { servidorId: 'A', nombre: 'intruso', tipo: 'texto' })
    await assertFails(lote.commit())
  })
})
