import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../../test/firestoreMock')).mockFirestore)
vi.mock('../../lib/firebase', () => ({ db: { tipo: 'db' } }))

import { useDatosStore } from '../../store/datosStore'
import { useUiStore } from '../../store/uiStore'
import { registro, reiniciar, type Escucha } from '../../test/firestoreMock'
import { detenerEscuchas, esperarServidor, iniciarEscuchas } from './escuchas'

const unDoc = (id: string, datos: Record<string, unknown>, pendiente = false) => ({ id, data: () => datos, metadata: { hasPendingWrites: pendiente } })
const lista = (docs: ReturnType<typeof unDoc>[]) => ({ docs })
const documento = (id: string, datos: Record<string, unknown> | null) => ({ id, exists: () => datos !== null, data: () => datos ?? undefined })

const buscar = (ruta: string): Escucha => {
  const e = registro.escuchas.filter((x) => x.ruta === ruta).at(-1)
  if (!e) throw new Error(`No hay escucha en ${ruta}`)
  return e
}
const estado = () => useDatosStore.getState()

const datosServidor = { nombre: 'Alfa', descripcion: '', iniciales: 'AL', color: '#6366f1', propietarioUid: 'yo', privacidad: 'invitacion' }
const datosMiembro = (uid: string, rol = 'miembro') => ({ uid, servidorId: 'A', rol, correo: `${uid}@t.com` })

/** Entrega las instantáneas de un servidor y de sus perfiles. */
function entregarServidor(sid: string, uids: string[]) {
  buscar(`servidores/${sid}`).siguiente(documento(sid, datosServidor))
  buscar(`servidores/${sid}/miembros`).siguiente(lista(uids.map((u) => unDoc(u, datosMiembro(u, u === 'yo' ? 'propietario' : 'miembro')))))
  buscar(`servidores/${sid}/canales`).siguiente(lista([
    unDoc('voz', { servidorId: sid, nombre: 'Sala', tipo: 'voz' }),
    unDoc('otro', { servidorId: sid, nombre: 'zeta', tipo: 'texto' }),
    unDoc('general', { servidorId: sid, nombre: 'general', tipo: 'texto' }),
  ]))
}
const entregarPerfiles = (uids: string[]) =>
  uids.forEach((u) => buscar(`usuarios/${u}`).siguiente(documento(u, { nombre: u, iniciales: 'XX', color: '#fff', estado: 'en-linea' })))
const membresias = (...sids: string[]) => buscar('miembros').siguiente(lista(sids.map((s) => unDoc(`yo-${s}`, { uid: 'yo', servidorId: s }))))

describe('escuchas de Firestore', () => {
  beforeEach(() => {
    reiniciar()
    useDatosStore.getState().limpiar()
    useUiStore.setState({ toasts: [] })
  })
  afterEach(() => {
    detenerEscuchas()
    vi.useRealTimers()
  })

  it('consulta mis membresías con collectionGroup + where uid y pasa a «cargando»', () => {
    iniciarEscuchas('yo')
    expect(estado().estado).toBe('cargando')
    const m = buscar('miembros')
    expect(m.grupo).toBe(true)
    expect(m.filtros).toEqual([{ campo: 'uid', op: '==', valor: 'yo' }])
  })

  it('sin servidores pasa a «listo» al llegar la consulta de membresías', () => {
    iniciarEscuchas('yo')
    membresias()
    expect(estado().estado).toBe('listo')
  })

  it('al llegar una membresía abre las 3 escuchas del servidor y la del perfil; pasa a «listo» al recibir todo', () => {
    iniciarEscuchas('yo')
    membresias('A')
    expect(estado().pendientes.A).toBe(true)
    expect(registro.escuchas.map((e) => e.ruta)).toEqual(expect.arrayContaining(['servidores/A', 'servidores/A/miembros', 'servidores/A/canales']))

    entregarServidor('A', ['yo', 'otra'])
    expect(estado().pendientes.A).toBeUndefined()
    expect(registro.escuchas.map((e) => e.ruta)).toEqual(expect.arrayContaining(['usuarios/yo', 'usuarios/otra']))
    expect(estado().estado).toBe('cargando')

    entregarPerfiles(['yo', 'otra'])
    expect(estado().estado).toBe('listo')
    expect(estado().servidores.A.nombre).toBe('Alfa')
    expect(Object.keys(estado().miembros.A)).toEqual(['yo', 'otra'])
    expect(estado().miembros.A.otra).toMatchObject({ rol: 'miembro', correo: 'otra@t.com' })
    expect(estado().canales.A.map((c) => c.canalId)).toEqual(['general', 'otro', 'voz'])
    expect(estado().perfiles.otra.nombre).toBe('otra')
  })

  it('un perfil inexistente cuenta como recibido', () => {
    iniciarEscuchas('yo')
    membresias('A')
    entregarServidor('A', ['yo', 'fantasma'])
    buscar('usuarios/yo').siguiente(documento('yo', { nombre: 'Yo', iniciales: 'Y', color: '#fff', estado: 'en-linea' }))
    buscar('usuarios/fantasma').siguiente(documento('fantasma', null))
    expect(estado().estado).toBe('listo')
    expect(estado().perfiles.fantasma).toBeUndefined()
  })

  it('una membresía con escritura pendiente no abre el servidor hasta confirmarse', () => {
    iniciarEscuchas('yo')
    buscar('miembros').siguiente(lista([unDoc('yo-A', { uid: 'yo', servidorId: 'A' }, true)]))
    expect(registro.escuchas.some((e) => e.ruta === 'servidores/A')).toBe(false)
    membresias('A')
    expect(registro.escuchas.some((e) => e.ruta === 'servidores/A')).toBe(true)
  })

  it('al desaparecer la membresía cancela sus escuchas y quita el servidor de la caché', () => {
    iniciarEscuchas('yo')
    membresias('A')
    entregarServidor('A', ['yo', 'otra'])
    entregarPerfiles(['yo', 'otra'])
    expect(estado().servidores.A).toBeDefined()

    membresias()
    for (const ruta of ['servidores/A', 'servidores/A/miembros', 'servidores/A/canales', 'usuarios/yo', 'usuarios/otra']) {
      expect(buscar(ruta).cancelada).toBe(true)
    }
    expect(estado().servidores.A).toBeUndefined()
    expect(estado().miembros.A).toBeUndefined()
    expect(estado().canales.A).toBeUndefined()
    expect(estado().perfiles.otra).toBeUndefined()
    expect(estado().estado).toBe('listo')
  })

  it('un permission-denied en una escucha de servidor lo quita sin dejarlo pendiente ni mostrar aviso', () => {
    iniciarEscuchas('yo')
    membresias('A', 'B')
    entregarServidor('B', ['yo'])
    buscar('servidores/A').error({ code: 'permission-denied' })
    expect(estado().pendientes.A).toBeUndefined()
    expect(estado().servidores.A).toBeUndefined()
    expect(buscar('servidores/A/miembros').cancelada).toBe(true)
    entregarPerfiles(['yo'])
    expect(estado().estado).toBe('listo')
    expect(useUiStore.getState().toasts).toEqual([])
    expect(estado().servidores.B).toBeDefined()
  })

  it('un servidor que ya no existe (lápida) tampoco deja la app cargando', () => {
    iniciarEscuchas('yo')
    membresias('A')
    buscar('servidores/A').siguiente(documento('A', null))
    expect(estado().pendientes.A).toBeUndefined()
    expect(estado().estado).toBe('listo')
  })

  it('si falla la consulta de membresías pasa a «error» y avisa', () => {
    iniciarEscuchas('yo')
    buscar('miembros').error({ code: 'unavailable' })
    expect(estado().estado).toBe('error')
    expect(useUiStore.getState().toasts.some((t) => t.tipo === 'error')).toBe(true)
  })

  it('si pasan 15 s sin estar listo pasa a «error»', () => {
    vi.useFakeTimers()
    iniciarEscuchas('yo')
    vi.advanceTimersByTime(14_999)
    expect(estado().estado).toBe('cargando')
    vi.advanceTimersByTime(2)
    expect(estado().estado).toBe('error')
  })

  it('una vez «listo» no vuelve a «cargando» al unirse a otro servidor', () => {
    iniciarEscuchas('yo')
    membresias()
    membresias('A')
    expect(estado().pendientes.A).toBe(true)
    expect(estado().estado).toBe('listo')
  })

  it('es idempotente para el mismo uid y con otro uid detiene lo anterior', () => {
    iniciarEscuchas('yo')
    iniciarEscuchas('yo')
    expect(registro.escuchas).toHaveLength(1)
    iniciarEscuchas('otro')
    expect(registro.escuchas[0].cancelada).toBe(true)
    expect(registro.escuchas).toHaveLength(2)
  })

  it('detenerEscuchas cancela todas las suscripciones y es seguro llamarla dos veces', () => {
    iniciarEscuchas('yo')
    membresias('A')
    entregarServidor('A', ['yo'])
    detenerEscuchas()
    detenerEscuchas()
    expect(registro.escuchas.length).toBeGreaterThanOrEqual(5)
    expect(registro.escuchas.every((e) => e.cancelada)).toBe(true)
  })

  it('esperarServidor resuelve cuando el servidor está completo y también al vencer el plazo', async () => {
    iniciarEscuchas('yo')
    membresias('A')
    const espera = esperarServidor('A')
    entregarServidor('A', ['yo'])
    await expect(espera).resolves.toBeUndefined()

    vi.useFakeTimers()
    const vencida = esperarServidor('nunca', 1000)
    vi.advanceTimersByTime(1001)
    await expect(vencida).resolves.toBeUndefined()
  })
})
