import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, enUnaHora, fs, prepararEntorno } from './entorno.ts'

/** Hallazgos del Hacker (hack-round-1). Cada prueba fallaba con las reglas de ef8b292. */
const entorno = prepararEntorno()
const db = (uid: string) => fs(como(entorno(), uid))

/** Batch de arranque: servidor `sid` + miembro propietario de `uid`. */
const arrancar = (c: Firestore, sid: string, uid: string) => {
  const lote = writeBatch(c)
  lote.set(doc(c, `servidores/${sid}`), {
    nombre: 'Servidor X', descripcion: '', iniciales: 'SX', color: 'indigo', propietarioUid: uid, privacidad: 'invitacion', creadoEn: serverTimestamp(),
  })
  lote.set(doc(c, `servidores/${sid}/miembros/${uid}`), {
    uid, servidorId: sid, rol: 'propietario', unidoEn: serverTimestamp(), correo: `${uid}@test.com`,
  })
  return lote
}

describe('S1 reusar el id de un servidor eliminado', () => {
  // luis es retirado por un admin (su doc de miembro desaparece) y después el propietario borra el servidor.
  const retirarALuis = () => deleteDoc(doc(db('admin'), 'servidores/A/miembros/luis'))

  it('con la lápida, nadie vuelve a crear el servidor ni lee sus datos huérfanos', async () => {
    await assertSucceeds(retirarALuis())
    const dueno = db('dueno')
    const lote = writeBatch(dueno)
    lote.delete(doc(dueno, 'servidores/A'))
    lote.set(doc(dueno, 'servidoresEliminados/A'), { eliminadoEn: serverTimestamp() })
    await assertSucceeds(lote.commit())
    await assertFails(arrancar(db('luis'), 'A', 'luis').commit())
    await assertFails(getDoc(doc(db('luis'), 'servidores/A/canales/general/mensajes/m1')))
  })

  it('solo el propietario escribe la lápida, y solo al borrar el servidor', async () => {
    await assertFails(setDoc(doc(db('admin'), 'servidoresEliminados/A'), { eliminadoEn: serverTimestamp() }))
    await assertFails(setDoc(doc(db('dueno'), 'servidoresEliminados/A'), { eliminadoEn: serverTimestamp() }))
    await assertFails(setDoc(doc(db('forastero'), 'servidoresEliminados/Z'), { eliminadoEn: serverTimestamp() }))
  })

  // Riesgo ABIERTO: el borrado simple (sin lápida) sigue permitido por la prueba DoD-16 existente.
  // `it.fails` documenta el hueco; cuando se exija la lápida al borrar, esta prueba se pondrá roja y debe pasar a `it`.
  it.fails('ABIERTO: tras un borrado simple, un exmiembro recrea el servidor y lee el historial', async () => {
    await assertSucceeds(retirarALuis())
    await assertSucceeds(deleteDoc(doc(db('dueno'), 'servidores/A')))
    await assertFails(arrancar(db('luis'), 'A', 'luis').commit())
  })
})

describe('S2 acaparar nombres de usuario', () => {
  it('reservar un nombre sin ponerlo en el perfil propio se rechaza', async () => {
    await assertFails(setDoc(doc(db('nuevo'), 'nombresUsuario/acaparado.1'), { uid: 'nuevo' }))
  })

  it('cambiar de nombre exige liberar el anterior en el mismo batch', async () => {
    const c = db('ana')
    const sinLiberar = writeBatch(c)
    sinLiberar.set(doc(c, 'nombresUsuario/ana.nueva'), { uid: 'ana' })
    sinLiberar.update(doc(c, 'usuarios/ana'), { usuario: 'ana.nueva', actualizadoEn: serverTimestamp() })
    await assertFails(sinLiberar.commit())

    const liberando = writeBatch(c)
    liberando.set(doc(c, 'nombresUsuario/ana.nueva'), { uid: 'ana' })
    liberando.update(doc(c, 'usuarios/ana'), { usuario: 'ana.nueva', actualizadoEn: serverTimestamp() })
    liberando.delete(doc(c, 'nombresUsuario/ana.p'))
    await assertSucceeds(liberando.commit())
  })
})

describe('S3 liberar un nombre que el perfil sigue usando', () => {
  it('borrar la reserva mientras el perfil la usa se rechaza (evita nombres duplicados)', async () => {
    await assertFails(deleteDoc(doc(db('ana'), 'nombresUsuario/ana.p')))
  })
})

describe('S4 invitación con vista previa falsa', () => {
  it('el nombre, iniciales y color de la invitación deben ser los del servidor', async () => {
    const falsa = {
      servidorId: 'B', invitaUid: 'duenoB', creadaEn: serverTimestamp(), expiraEn: enUnaHora(),
      servidorNombre: 'Estudio A', servidorIniciales: 'ES', servidorColor: 'indigo',
    }
    await assertFails(setDoc(doc(db('duenoB'), 'invitaciones/vista-previa-falsa-1'), falsa))
    await assertSucceeds(setDoc(doc(db('duenoB'), 'invitaciones/vista-previa-real-1'), { ...falsa, servidorNombre: 'Estudio B' }))
  })
})

describe('S5 ruta de grabación con metacaracteres de regex en el id', () => {
  it('un servidor con id ".*" no registra metadatos que apunten al archivo de otro servidor', async () => {
    const c = db('forastero')
    await assertSucceeds(arrancar(c, '.*', 'forastero').commit())
    const ses = 'servidores/.*/sesiones/s1'
    await assertSucceeds(setDoc(doc(c, `${ses}/consentimientos/forastero`), {
      uid: 'forastero', sesionId: 's1', estado: 'aceptado', actualizadoEn: serverTimestamp(),
    }))
    await assertFails(setDoc(doc(c, `${ses}/grabaciones/robo`), {
      servidorId: '.*', sesionId: 's1', titulo: 'x', canalNombre: 'voz', fecha: '2026-11-07', duracion: '1 min',
      creadorUid: 'forastero', tamano: '1 MB', ruta: 'grabaciones/A/s1/r1.webm', estado: 'lista', aceptaron: 1, participantes: 1,
    }))
  })
})

describe('regresión de los arreglos', () => {
  it('el registro normal (reservar + perfil en un batch) sigue funcionando', async () => {
    const c = db('nuevo')
    const lote = writeBatch(c)
    lote.set(doc(c, 'nombresUsuario/nuevo.ok'), { uid: 'nuevo' })
    lote.update(doc(c, 'usuarios/nuevo'), { usuario: 'nuevo.ok', actualizadoEn: serverTimestamp() })
    await assertSucceeds(lote.commit())
  })

  it('el perfil se actualiza sin tocar el nombre de usuario', async () => {
    await assertSucceeds(updateDoc(doc(db('ana'), 'usuarios/ana'), { estado: 'ausente', actualizadoEn: serverTimestamp() }))
  })
})
