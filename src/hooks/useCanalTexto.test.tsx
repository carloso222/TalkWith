import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socketFalso } from '../test/socketFalso'

vi.mock('../lib/socket', async () => {
  const real = await vi.importActual<typeof import('../lib/socket')>('../lib/socket')
  return { mensajeErrorSocket: real.mensajeErrorSocket, obtenerSocket: () => socketFalso }
})
vi.mock('../lib/firebase', () => ({ db: {}, obtenerTokenSocket: vi.fn() }))

const historial = vi.fn()
vi.mock('../services', () => ({ messageService: { getByChannel: (...a: unknown[]) => historial(...a) } }))

const notify = vi.fn()
vi.mock('../store/uiStore', () => ({ useUiStore: (sel: (s: { notify: typeof notify }) => unknown) => sel({ notify }) }))

import { useCanalTexto } from './useCanalTexto'

const guardado = (id: string, ms: number, contenido = id) => ({ mensajeId: id, canalId: 'general', autorUid: 'ana', contenido, creadoEn: '', creadoMs: ms })
const porSocket = (id: string, ms: number, extra = {}) => ({ mensajeId: id, servidorId: 'A', canalId: 'general', autorUid: 'beto', contenido: id, creadoMs: ms, ...extra })

const montar = () => renderHook(() => useCanalTexto('A', 'general', 'yo'))

describe('useCanalTexto (TW 09)', () => {
  beforeEach(() => {
    socketFalso.reiniciar()
    notify.mockReset()
    historial.mockReset()
    historial.mockResolvedValue([guardado('m1', 100), guardado('m2', 200)])
  })

  it('carga el historial y entra al canal', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.cargando).toBe(false))
    expect(historial).toHaveBeenCalledWith('A', 'general')
    expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m1', 'm2'])
    const entrar = socketFalso.ultimo('canal:entrar')!
    expect(entrar.datos).toEqual({ servidorId: 'A', canalId: 'general' })
    act(() => entrar.responder!({ ok: true }))
    expect(result.current.estado).toBe('conectado')
  })

  it('agrega los mensajes que llegan, en orden y sin repetir, solo de este canal', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => {
      socketFalso.disparar('mensaje:nuevo', porSocket('m4', 400))
      socketFalso.disparar('mensaje:nuevo', porSocket('m3', 300))
      socketFalso.disparar('mensaje:nuevo', porSocket('m3', 300))
      socketFalso.disparar('mensaje:nuevo', porSocket('x', 350, { canalId: 'otro' }))
    })
    expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m1', 'm2', 'm3', 'm4'])
  })

  it('al enviar se ve como pendiente hasta que el servidor confirma', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => result.current.enviar('  hola  '))
    const envio = socketFalso.ultimo('mensaje:enviar')!
    expect(envio.datos).toEqual({ servidorId: 'A', canalId: 'general', contenido: 'hola' })
    expect(result.current.mensajes.at(-1)).toMatchObject({ contenido: 'hola', autorUid: 'yo', enviando: true })

    act(() => envio.responder!({ ok: true, mensaje: porSocket('m9', 900, { autorUid: 'yo', contenido: 'hola' }) }))
    expect(result.current.mensajes.at(-1)).toMatchObject({ mensajeId: 'm9', contenido: 'hola' })
    expect(result.current.mensajes.some((m) => m.enviando)).toBe(false)
  })

  it('si el servidor rechaza el mensaje avisa y lo quita', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => result.current.enviar('hola'))
    act(() => socketFalso.ultimo('mensaje:enviar')!.responder!({ ok: false, error: 'muy-rapido' }))
    expect(notify).toHaveBeenCalledWith('error', 'No se envió tu mensaje', expect.stringMatching(/muy rápido/))
    expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m1', 'm2'])
  })

  it('al reconectar vuelve a entrar y pide el historial para no perder mensajes', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.cargando).toBe(false))
    act(() => socketFalso.ultimo('canal:entrar')!.responder!({ ok: true }))
    act(() => socketFalso.disparar('disconnect'))
    expect(result.current.estado).toBe('reconectando')

    historial.mockResolvedValue([guardado('m1', 100), guardado('m2', 200), guardado('perdido', 250)])
    act(() => socketFalso.disparar('connect'))
    act(() => socketFalso.ultimo('canal:entrar')!.responder!({ ok: true }))
    await waitFor(() => expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m1', 'm2', 'perdido']))
    expect(result.current.estado).toBe('conectado')
  })

  it('sin permiso muestra el error', async () => {
    const { result } = montar()
    act(() => socketFalso.ultimo('canal:entrar')!.responder!({ ok: false, error: 'sin-permiso' }))
    expect(result.current.estado).toBe('error')
    expect(result.current.error).toMatch(/No tienes acceso/)
  })

  it('al salir del canal avisa al servidor', () => {
    const { unmount } = montar()
    unmount()
    expect(socketFalso.ultimo('canal:salir')).toBeDefined()
  })
})
