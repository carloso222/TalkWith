import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// socket falso: guarda lo que se emite y deja disparar eventos desde la prueba
type Manejador = (...args: unknown[]) => void
const falso = {
  connected: true,
  active: true,
  manejadores: new Map<string, Set<Manejador>>(),
  emitidos: [] as { evento: string; datos: unknown; responder?: Manejador }[],
  on(evento: string, fn: Manejador) {
    if (!this.manejadores.has(evento)) this.manejadores.set(evento, new Set())
    this.manejadores.get(evento)!.add(fn)
  },
  off(evento: string, fn: Manejador) {
    this.manejadores.get(evento)?.delete(fn)
  },
  emit(evento: string, datos?: unknown, responder?: Manejador) {
    this.emitidos.push({ evento, datos, responder })
  },
  disparar(evento: string, ...args: unknown[]) {
    this.manejadores.get(evento)?.forEach((fn) => fn(...args))
  },
}

vi.mock('../lib/socket', async () => {
  const real = await vi.importActual<typeof import('../lib/socket')>('../lib/socket')
  return { mensajeErrorSocket: real.mensajeErrorSocket, obtenerSocket: () => falso }
})
vi.mock('../lib/firebase', () => ({ obtenerTokenSocket: vi.fn() }))

import { useSalaVoz } from './useSalaVoz'

const ana = { uid: 'ana', silenciado: false, hablando: false, reconectando: false }
const beto = { uid: 'beto', silenciado: true, hablando: false, reconectando: false }

const ultimo = (evento: string) => [...falso.emitidos].reverse().find((e) => e.evento === evento)

function montar(yo = { silenciado: false, hablando: false }) {
  return renderHook((props) => useSalaVoz('A', 'voz', props), { initialProps: yo })
}

describe('useSalaVoz (TW 12 y 14)', () => {
  beforeEach(() => {
    falso.connected = true
    falso.active = true
    falso.manejadores.clear()
    falso.emitidos = []
  })

  it('entra a la sala y guarda participantes y sesion', () => {
    const { result } = montar()
    expect(result.current.estado).toBe('conectando')
    const unirse = ultimo('sala:unirse')!
    expect(unirse.datos).toEqual({ servidorId: 'A', canalId: 'voz' })
    act(() => unirse.responder!({ ok: true, sesionId: 'ses1', inicio: 1000, participantes: [ana] }))
    expect(result.current).toMatchObject({ estado: 'conectado', sesionId: 'ses1', inicio: 1000, participantes: [ana] })
  })

  it('muestra el error si el servidor no lo deja entrar', () => {
    const { result } = montar()
    act(() => ultimo('sala:unirse')!.responder!({ ok: false, error: 'sin-permiso' }))
    expect(result.current.estado).toBe('error')
    expect(result.current.error).toBe('No tienes acceso a este canal de voz.')
  })

  it('actualiza la lista cuando el servidor avisa, solo si es su sala', () => {
    const { result } = montar()
    act(() => ultimo('sala:unirse')!.responder!({ ok: true, sesionId: 'ses1', inicio: 1, participantes: [ana] }))
    act(() => falso.disparar('sala:participantes', { servidorId: 'A', canalId: 'otra', participantes: [] }))
    expect(result.current.participantes).toEqual([ana])
    act(() => falso.disparar('sala:participantes', { servidorId: 'A', canalId: 'voz', participantes: [ana, beto] }))
    expect(result.current.participantes).toEqual([ana, beto])
  })

  it('al perder la conexion queda reconectando y al volver entra otra vez', () => {
    const { result } = montar()
    act(() => ultimo('sala:unirse')!.responder!({ ok: true, sesionId: 'ses1', inicio: 1, participantes: [ana] }))
    act(() => falso.disparar('disconnect'))
    expect(result.current.estado).toBe('reconectando')
    falso.emitidos = []
    act(() => falso.disparar('connect'))
    const otraVez = ultimo('sala:unirse')!
    act(() => otraVez.responder!({ ok: true, sesionId: 'ses1', inicio: 1, participantes: [ana] }))
    expect(result.current.estado).toBe('conectado')
  })

  it('si el servidor rechaza el token deja de intentar y lo dice', () => {
    const { result } = montar()
    falso.active = false
    act(() => falso.disparar('connect_error', new Error('token-invalido')))
    expect(result.current.estado).toBe('error')
    expect(result.current.error).toMatch(/sesión expiró/)
  })

  it('avisa al servidor cuando me silencio y al salir', () => {
    const { result, rerender, unmount } = montar()
    act(() => ultimo('sala:unirse')!.responder!({ ok: true, sesionId: 'ses1', inicio: 1, participantes: [ana] }))
    rerender({ silenciado: true, hablando: false })
    expect(ultimo('sala:estado')!.datos).toEqual({ silenciado: true, hablando: false })
    expect(result.current.estado).toBe('conectado')
    unmount()
    expect(ultimo('sala:salir')).toBeDefined()
  })

  it('espera un poco antes de avisar que ya no hablo', () => {
    vi.useFakeTimers()
    const { rerender } = montar()
    act(() => ultimo('sala:unirse')!.responder!({ ok: true, sesionId: 'ses1', inicio: 1, participantes: [ana] }))
    rerender({ silenciado: false, hablando: true })
    expect(ultimo('sala:estado')!.datos).toEqual({ silenciado: false, hablando: true })
    rerender({ silenciado: false, hablando: false })
    expect(ultimo('sala:estado')!.datos).toEqual({ silenciado: false, hablando: true })
    act(() => vi.advanceTimersByTime(900))
    expect(ultimo('sala:estado')!.datos).toEqual({ silenciado: false, hablando: false })
    vi.useRealTimers()
  })
})
