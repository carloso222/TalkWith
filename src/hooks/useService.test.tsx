import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDatosStore } from '../store/datosStore'
import { useService } from './useService'

describe('useService', () => {
  beforeEach(() => useDatosStore.getState().limpiar())

  it('carga los datos y apaga loading', async () => {
    const fn = vi.fn(async () => 'a')
    const { result } = renderHook(() => useService(fn, []))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('a'))
    expect(result.current.loading).toBe(false)
  })

  it('un cambio de version vuelve a llamar a fn sin poner loading en true si ya hay datos', async () => {
    let valor = 'a'
    const fn = vi.fn(async () => valor)
    const { result } = renderHook(() => useService(fn, []))
    await waitFor(() => expect(result.current.data).toBe('a'))
    const llamadas = fn.mock.calls.length

    valor = 'b'
    act(() => useDatosStore.getState().ponerEstado('listo'))
    expect(result.current.loading).toBe(false)
    await waitFor(() => expect(result.current.data).toBe('b'))

    expect(fn.mock.calls.length).toBe(llamadas + 1)
    expect(result.current.loading).toBe(false)
  })

  it('un cambio de dependencias sí vuelve a mostrar loading', async () => {
    const fn = vi.fn(async (x: string) => x)
    const { result, rerender } = renderHook(({ x }) => useService(() => fn(x), [x]), { initialProps: { x: 'a' } })
    await waitFor(() => expect(result.current.data).toBe('a'))
    rerender({ x: 'b' })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('b'))
  })
})
