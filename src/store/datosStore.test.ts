import { beforeEach, describe, expect, it } from 'vitest'
import { canal, miembro } from '../test/fixtures'
import { useDatosStore } from './datosStore'

const srv = { servidorId: 'A', nombre: 'A', descripcion: '', iniciales: 'A', color: '#fff', propietarioUid: 'u', privacidad: 'invitacion' as const }
const perfil = { uid: 'u', nombre: 'U', usuario: 'u', iniciales: 'U', color: '#fff', estado: 'en-linea' as const }

describe('datosStore', () => {
  beforeEach(() => useDatosStore.getState().limpiar())

  it('cada mutación incrementa version', () => {
    const s = useDatosStore.getState()
    const acciones: Array<() => void> = [
      () => s.ponerEstado('cargando'),
      () => s.ponerServidor('A', srv),
      () => s.ponerMiembros('A', { u: miembro('A', 'u', 'miembro') }),
      () => s.ponerCanales('A', [canal('A', 'c', 'general')]),
      () => s.ponerPerfil('u', perfil),
      () => s.quitarPerfil('u'),
      () => s.ponerPrevia('B', { ...srv, servidorId: 'B', totalMiembros: 0 }),
      () => s.marcarPendiente('A'),
      () => s.quitarPendiente('A'),
      () => s.quitarServidor('A'),
      () => s.limpiar(),
    ]
    for (const accion of acciones) {
      const antes = useDatosStore.getState().version
      accion()
      expect(useDatosStore.getState().version).toBe(antes + 1)
    }
  })

  it('limpiar deja el estado inicial', () => {
    const s = useDatosStore.getState()
    s.ponerEstado('listo')
    s.ponerServidor('A', srv)
    s.ponerMiembros('A', { u: miembro('A', 'u', 'miembro') })
    s.ponerCanales('A', [canal('A', 'c', 'general')])
    s.ponerPerfil('u', perfil)
    s.ponerPrevia('B', { ...srv, servidorId: 'B', totalMiembros: 0 })
    s.marcarPendiente('A')
    s.limpiar()
    expect(useDatosStore.getState()).toMatchObject({
      estado: 'inactivo', servidores: {}, miembros: {}, canales: {}, perfiles: {}, previas: {}, pendientes: {},
    })
  })

  it('quitarServidor borra servidor, miembros, canales y pendiente de ese id y no toca otros', () => {
    const s = useDatosStore.getState()
    for (const id of ['A', 'B']) {
      s.ponerServidor(id, { ...srv, servidorId: id })
      s.ponerMiembros(id, {})
      s.ponerCanales(id, [])
      s.marcarPendiente(id)
    }
    s.quitarServidor('A')
    const e = useDatosStore.getState()
    expect(Object.keys(e.servidores)).toEqual(['B'])
    expect(Object.keys(e.miembros)).toEqual(['B'])
    expect(Object.keys(e.canales)).toEqual(['B'])
    expect(Object.keys(e.pendientes)).toEqual(['B'])
  })
})
