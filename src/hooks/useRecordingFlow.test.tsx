import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socketFalso } from '../test/socketFalso'
import type { GrabacionSala } from '../types'
import type { FinGrabacion } from './useSalaVoz'

vi.mock('../lib/socket', async () => {
  const real = await vi.importActual<typeof import('../lib/socket')>('../lib/socket')
  return { mensajeErrorSocket: real.mensajeErrorSocket, obtenerSocket: () => socketFalso }
})
vi.mock('../lib/firebase', () => ({ db: {}, obtenerTokenSocket: vi.fn() }))
vi.mock('../services', () => ({ userService: { find: (uid: string) => ({ nombre: uid === 'beto' ? 'Beto Ruiz' : 'Ana Gil' }) } }))
const notify = vi.fn()
vi.mock('../store/uiStore', () => ({ useUiStore: (sel: (s: { notify: typeof notify }) => unknown) => sel({ notify }) }))

import { textoFin, useRecordingFlow } from './useRecordingFlow'

const solicitada = (estados: GrabacionSala['estados'], solicitante = 'ana'): GrabacionSala => ({ id: 1, fase: 'solicitada', solicitante, estados, inicio: null })

function montar(inicial: { grabacion: GrabacionSala | null; finGrabacion?: FinGrabacion | null }, yoUid = 'yo') {
  return renderHook((p) => useRecordingFlow({ yoUid, grabacion: p.grabacion, finGrabacion: p.finGrabacion ?? null }), { initialProps: inicial })
}

describe('useRecordingFlow (TW 20)', () => {
  beforeEach(() => {
    socketFalso.reiniciar()
    notify.mockReset()
  })

  it('sin grabación está inactiva', () => {
    const { result } = montar({ grabacion: null })
    expect(result.current).toMatchObject({ fase: 'inactiva', dialogoAbierto: false, segundos: 0 })
  })

  it('cuando otra persona pide grabar, me toca responder y el diálogo se abre solo', () => {
    const { result } = montar({ grabacion: solicitada({ ana: 'aceptado', yo: 'pendiente' }) })
    expect(result.current.fase).toBe('respondiendo')
    expect(result.current.dialogoAbierto).toBe(true)
    expect(result.current.involucrados).toEqual(['ana', 'yo'])
  })

  it('aceptar manda mi respuesta con el id de la solicitud', () => {
    const { result } = montar({ grabacion: solicitada({ ana: 'aceptado', yo: 'pendiente' }) })
    act(() => result.current.aceptar())
    expect(socketFalso.ultimo('grabacion:responder')!.datos).toEqual({ id: 1, acepta: true })
    act(() => result.current.rechazar())
    expect(socketFalso.ultimo('grabacion:responder')!.datos).toEqual({ id: 1, acepta: false })
  })

  it('después de aceptar espera a los demás y el diálogo se cierra', () => {
    const { result, rerender } = montar({ grabacion: solicitada({ ana: 'aceptado', yo: 'pendiente', beto: 'pendiente' }) })
    rerender({ grabacion: solicitada({ ana: 'aceptado', yo: 'aceptado', beto: 'pendiente' }) })
    expect(result.current.fase).toBe('esperando')
    expect(result.current.dialogoAbierto).toBe(false)
  })

  it('cerrar el diálogo no lo vuelve a abrir para la misma solicitud', () => {
    const { result } = montar({ grabacion: solicitada({ ana: 'aceptado', yo: 'pendiente' }) })
    act(() => result.current.cerrarDialogo())
    expect(result.current.dialogoAbierto).toBe(false)
    act(() => result.current.abrirDialogo())
    expect(result.current.dialogoAbierto).toBe(true)
  })

  it('al pedir yo, el diálogo se abre cuando el servidor confirma', () => {
    const { result, rerender } = montar({ grabacion: null })
    act(() => result.current.solicitar())
    const g = solicitada({ yo: 'aceptado', beto: 'pendiente' }, 'yo')
    act(() => socketFalso.ultimo('grabacion:solicitar')!.responder!({ ok: true, grabacion: g }))
    rerender({ grabacion: g })
    expect(result.current).toMatchObject({ fase: 'esperando', dialogoAbierto: true, solicitanteUid: 'yo' })
  })

  it('si el servidor rechaza la acción, avisa el error', () => {
    const { result } = montar({ grabacion: null })
    act(() => result.current.solicitar())
    act(() => socketFalso.ultimo('grabacion:solicitar')!.responder!({ ok: false, error: 'grabacion-en-curso' }))
    expect(notify).toHaveBeenCalledWith('error', 'No se pudo completar', expect.stringMatching(/grabación en curso/))
  })

  it('cuando todos aceptan: fase grabando, aviso una sola vez y cronómetro desde el inicio del servidor', () => {
    vi.useFakeTimers()
    const inicio = Date.now() - 65_000
    const grabando: GrabacionSala = { id: 1, fase: 'grabando', solicitante: 'ana', estados: { ana: 'aceptado', yo: 'aceptado' }, inicio }
    const { result, rerender } = montar({ grabacion: grabando })
    expect(result.current.fase).toBe('grabando')
    expect(result.current.segundos).toBeGreaterThanOrEqual(65)
    rerender({ grabacion: { ...grabando } })
    expect(notify.mock.calls.filter((c) => c[1] === 'Grabación iniciada')).toHaveLength(1)
    vi.useRealTimers()
  })

  it('detener y cancelar emiten al servidor', () => {
    const { result } = montar({ grabacion: null })
    act(() => result.current.detener())
    act(() => result.current.cancelar())
    expect(socketFalso.ultimo('grabacion:detener')).toBeDefined()
    expect(socketFalso.ultimo('grabacion:cancelar')).toBeDefined()
  })

  it('avisa por qué terminó cada vez que llega un aviso nuevo', () => {
    const { rerender } = montar({ grabacion: null, finGrabacion: null })
    rerender({ grabacion: null, finGrabacion: { motivo: 'rechazada', por: 'beto', n: 1 } })
    expect(notify).toHaveBeenLastCalledWith('info', 'No se grabará la llamada', 'Beto no aceptó la grabación.')
    rerender({ grabacion: null, finGrabacion: { motivo: 'rechazada', por: 'beto', n: 2 } })
    expect(notify).toHaveBeenCalledTimes(2)
  })
})

describe('textoFin', () => {
  it('explica cada motivo', () => {
    expect(textoFin({ motivo: 'detenida', por: 'beto', n: 1 }, 'yo')).toEqual({ titulo: 'Grabación detenida', descripcion: 'La detuvo Beto.' })
    expect(textoFin({ motivo: 'detenida', por: 'yo', n: 1 }, 'yo').descripcion).toBeUndefined()
    expect(textoFin({ motivo: 'salio', por: 'beto', n: 1 }, 'yo').descripcion).toMatch(/salió de la llamada/)
    expect(textoFin({ motivo: 'nuevo-participante', por: 'beto', n: 1 }, 'yo').descripcion).toMatch(/no había aceptado/)
    expect(textoFin({ motivo: 'rechazada', por: 'yo', n: 1 }, 'yo').titulo).toBe('Rechazaste la grabación')
  })
})
