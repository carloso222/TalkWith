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

describe('useCanalTexto: editar y borrar', () => {
  beforeEach(() => {
    socketFalso.reiniciar()
    notify.mockReset()
    historial.mockReset()
    historial.mockResolvedValue([guardado('m1', 100), guardado('m2', 200)])
  })

  const cargado = async () => {
    const hook = montar()
    await waitFor(() => expect(hook.result.current.cargando).toBe(false))
    return hook
  }

  it('las ediciones de otras personas llegan en vivo y marcan el mensaje como editado', async () => {
    const { result } = await cargado()
    act(() => {
      socketFalso.disparar('mensaje:editado', { mensajeId: 'm1', servidorId: 'A', canalId: 'general', contenido: 'corregido', editadoMs: 150 })
      socketFalso.disparar('mensaje:editado', { mensajeId: 'm2', servidorId: 'A', canalId: 'otro', contenido: 'no es de aqui', editadoMs: 150 })
    })
    expect(result.current.mensajes[0]).toMatchObject({ mensajeId: 'm1', contenido: 'corregido', editadoMs: 150, creadoMs: 100 })
    expect(result.current.mensajes[1]).toMatchObject({ contenido: 'm2' })
    expect(result.current.mensajes[1].editadoMs).toBeUndefined()
  })

  it('los borrados llegan en vivo', async () => {
    const { result } = await cargado()
    act(() => socketFalso.disparar('mensaje:borrado', { mensajeId: 'm1', servidorId: 'A', canalId: 'general' }))
    expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m2'])
  })

  it('editar manda el cambio y lo aplica cuando el servidor confirma', async () => {
    const { result } = await cargado()
    let ok: Promise<boolean>
    act(() => {
      ok = result.current.editar('m1', '  nuevo texto  ')
    })
    const envio = socketFalso.ultimo('mensaje:editar')!
    expect(envio.datos).toEqual({ servidorId: 'A', canalId: 'general', mensajeId: 'm1', contenido: 'nuevo texto' })
    act(() => envio.responder!({ ok: true, mensaje: { mensajeId: 'm1', servidorId: 'A', canalId: 'general', contenido: 'nuevo texto', editadoMs: 500 } }))
    await expect(ok!).resolves.toBe(true)
    expect(result.current.mensajes[0]).toMatchObject({ contenido: 'nuevo texto', editadoMs: 500 })
  })

  it('si el servidor rechaza la edición avisa y no cambia nada', async () => {
    const { result } = await cargado()
    let ok: Promise<boolean>
    act(() => {
      ok = result.current.editar('m1', 'nuevo')
    })
    act(() => socketFalso.ultimo('mensaje:editar')!.responder!({ ok: false, error: 'sin-permiso' }))
    await expect(ok!).resolves.toBe(false)
    expect(notify).toHaveBeenCalledWith('error', 'No se guardó la edición', expect.any(String))
    expect(result.current.mensajes[0].contenido).toBe('m1')
  })

  it('borrar quita el mensaje cuando el servidor confirma (o si ya no existía)', async () => {
    const { result } = await cargado()
    act(() => void result.current.borrar('m1'))
    expect(socketFalso.ultimo('mensaje:borrar')!.datos).toEqual({ servidorId: 'A', canalId: 'general', mensajeId: 'm1' })
    act(() => socketFalso.ultimo('mensaje:borrar')!.responder!({ ok: true }))
    expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m2'])

    act(() => void result.current.borrar('m2'))
    act(() => socketFalso.ultimo('mensaje:borrar')!.responder!({ ok: false, error: 'no-existe' }))
    expect(result.current.mensajes).toEqual([])
    expect(notify).toHaveBeenCalledWith('error', 'No se eliminó el mensaje', 'Ese mensaje ya no existe.')
  })

  it('al reconectar, lo que se borró o editó mientras tanto queda al día', async () => {
    const { result } = await cargado()
    act(() => socketFalso.ultimo('canal:entrar')!.responder!({ ok: true }))
    act(() => socketFalso.disparar('disconnect'))
    // mientras no habia conexion: m1 se borro y m2 se edito
    historial.mockResolvedValue([{ ...guardado('m2', 200, 'editado'), editadoMs: 300 }])
    act(() => socketFalso.disparar('connect'))
    act(() => socketFalso.ultimo('canal:entrar')!.responder!({ ok: true }))
    await waitFor(() => expect(result.current.mensajes.map((m) => m.mensajeId)).toEqual(['m2']))
    expect(result.current.mensajes[0]).toMatchObject({ contenido: 'editado', editadoMs: 300 })
  })
})
