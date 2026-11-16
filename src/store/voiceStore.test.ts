import { beforeEach, describe, expect, it } from 'vitest'
import { micApagado, useVoiceStore } from './voiceStore'

const estado = () => useVoiceStore.getState()

describe('voiceStore: micrófono y audífonos', () => {
  beforeEach(() => useVoiceStore.setState(useVoiceStore.getInitialState(), true))

  it('empieza con micrófono y audio encendidos', () => {
    expect(estado()).toMatchObject({ silenciado: false, ensordecido: false })
    expect(micApagado(estado())).toBe(false)
  })

  it('el micrófono se silencia y se vuelve a activar', () => {
    estado().alternarSilencio()
    expect(micApagado(estado())).toBe(true)
    estado().alternarSilencio()
    expect(micApagado(estado())).toBe(false)
  })

  it('ensordecerse también apaga el micrófono', () => {
    estado().alternarEnsordecido()
    expect(estado().ensordecido).toBe(true)
    expect(micApagado(estado())).toBe(true)
  })

  it('al quitar el ensordecido el micrófono vuelve a como estaba', () => {
    estado().alternarEnsordecido()
    estado().alternarEnsordecido()
    expect(micApagado(estado())).toBe(false)

    estado().alternarSilencio()
    estado().alternarEnsordecido()
    estado().alternarEnsordecido()
    expect(micApagado(estado())).toBe(true)
  })

  it('pulsar el micrófono estando ensordecido enciende las dos cosas', () => {
    estado().alternarSilencio()
    estado().alternarEnsordecido()
    estado().alternarSilencio()
    expect(estado()).toMatchObject({ silenciado: false, ensordecido: false })
  })
})
