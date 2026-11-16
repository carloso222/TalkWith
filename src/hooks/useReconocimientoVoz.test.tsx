import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReconocimientoVoz } from './useReconocimientoVoz'

// reconocedor falso: guarda las instancias para disparar eventos desde la prueba
class ReconocedorFalso {
  static instancias: ReconocedorFalso[] = []
  lang = ''
  continuous = false
  interimResults = false
  arrancado = 0
  abortado = false
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  constructor() {
    ReconocedorFalso.instancias.push(this)
  }
  start() {
    this.arrancado++
  }
  stop() {}
  abort() {
    this.abortado = true
  }
  // resultados: [texto, esFinal]
  decir(...resultados: [string, boolean][]) {
    const results = resultados.map(([t, f]) => ({ isFinal: f, 0: { transcript: t } }))
    this.onresult?.({ resultIndex: 0, results: Object.assign(results, { length: results.length }) })
  }
}

const ultimo = () => ReconocedorFalso.instancias[ReconocedorFalso.instancias.length - 1]

function montar(activo = true) {
  const alFinal = vi.fn()
  const hook = renderHook((props) => useReconocimientoVoz({ activo: props.activo, alFinal }), { initialProps: { activo } })
  return { ...hook, alFinal }
}

describe('useReconocimientoVoz (TW 15)', () => {
  beforeEach(() => {
    ReconocedorFalso.instancias = []
    vi.stubGlobal('webkitSpeechRecognition', ReconocedorFalso)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('sin la api del navegador avisa que no hay soporte', () => {
    vi.unstubAllGlobals()
    const { result } = montar()
    expect(result.current).toMatchObject({ soportado: false, estado: 'no-soportado' })
  })

  it('no escucha mientras no esté activo', () => {
    const { result } = montar(false)
    expect(ReconocedorFalso.instancias).toHaveLength(0)
    expect(result.current.estado).toBe('inactivo')
  })

  it('escucha en español, continuo y con resultados provisionales', () => {
    const { result } = montar()
    expect(ultimo()).toMatchObject({ lang: 'es-MX', continuous: true, interimResults: true, arrancado: 1 })
    expect(result.current.estado).toBe('escuchando')
  })

  it('muestra lo provisional y entrega solo las frases terminadas', () => {
    const { result, alFinal } = montar()
    act(() => ultimo().decir(['hola a', false]))
    expect(result.current.parcial).toBe('hola a')
    expect(alFinal).not.toHaveBeenCalled()

    act(() => ultimo().decir([' hola a todos ', true], ['qué', false]))
    expect(alFinal).toHaveBeenCalledWith('hola a todos')
    expect(result.current.parcial).toBe('qué')
  })

  it('ignora frases vacías', () => {
    const { alFinal } = montar()
    act(() => ultimo().decir(['   ', true]))
    expect(alFinal).not.toHaveBeenCalled()
  })

  it('vuelve a arrancar cuando el navegador lo corta por silencio', () => {
    vi.useFakeTimers()
    montar()
    act(() => ultimo().onerror?.({ error: 'no-speech' }))
    act(() => ultimo().onend?.())
    act(() => vi.advanceTimersByTime(300))
    expect(ultimo().arrancado).toBe(2)
  })

  it('si el navegador lo bloquea, se detiene y lo dice', () => {
    vi.useFakeTimers()
    const { result } = montar()
    act(() => ultimo().onerror?.({ error: 'not-allowed' }))
    act(() => ultimo().onend?.())
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.estado).toBe('denegado')
    expect(ultimo().arrancado).toBe(1)
  })

  it('al silenciar (activo = false) corta el reconocimiento', () => {
    const { result, rerender, alFinal } = montar()
    const rec = ultimo()
    rerender({ activo: false })
    expect(rec.abortado).toBe(true)
    expect(result.current.estado).toBe('inactivo')
    // lo que llegue tarde ya no se guarda
    rec.decir(['tarde', true])
    expect(alFinal).not.toHaveBeenCalled()
  })

  it('usa siempre la última versión de alFinal sin reiniciar', () => {
    const primero = vi.fn()
    const segundo = vi.fn()
    const { rerender } = renderHook((props) => useReconocimientoVoz({ activo: true, alFinal: props.fn }), { initialProps: { fn: primero } })
    rerender({ fn: segundo })
    expect(ReconocedorFalso.instancias).toHaveLength(1)
    act(() => ultimo().decir(['hola', true]))
    expect(segundo).toHaveBeenCalledWith('hola')
    expect(primero).not.toHaveBeenCalled()
  })
})
