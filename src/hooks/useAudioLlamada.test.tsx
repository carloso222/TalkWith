import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { socketFalso } from '../test/socketFalso'
import type { ParticipanteLlamada } from '../types'

vi.mock('../lib/socket', () => ({ obtenerSocket: () => socketFalso }))
vi.mock('../lib/firebase', () => ({ obtenerTokenSocket: vi.fn() }))

import { useAudioLlamada } from './useAudioLlamada'

// RTCPeerConnection falso: solo guarda lo que le hacen
class PcFalso {
  static todas: PcFalso[] = []
  transceivers: { direction: string; sender: { pista?: unknown; replaceTrack: (p: unknown) => Promise<void> } }[] = []
  localDescription: RTCSessionDescriptionInit | null = null
  remoteDescription: RTCSessionDescriptionInit | null = null
  signalingState = 'stable'
  connectionState = 'new'
  candidatos: unknown[] = []
  cerrada = false
  onicecandidate: ((e: { candidate: unknown }) => void) | null = null
  ontrack: ((e: { streams: unknown[]; track: unknown }) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  constructor() {
    PcFalso.todas.push(this)
  }
  addTransceiver(_tipo: string, init: { direction: string }) {
    const t = { direction: init.direction, sender: { pista: undefined as unknown, replaceTrack: async (p: unknown) => void (t.sender.pista = p) } }
    this.transceivers.push(t)
    return t
  }
  getTransceivers() {
    return this.transceivers
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: 'oferta' }
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: 'respuesta' }
  }
  async setLocalDescription(d: RTCSessionDescriptionInit) {
    this.localDescription = d
    this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable'
  }
  async setRemoteDescription(d: RTCSessionDescriptionInit) {
    this.remoteDescription = d
    if (d.type === 'offer') {
      this.signalingState = 'have-remote-offer'
      if (!this.transceivers.length) this.addTransceiver('audio', { direction: 'recvonly' })
    } else {
      this.signalingState = 'stable'
    }
  }
  async addIceCandidate(c: unknown) {
    this.candidatos.push(c)
  }
  close() {
    this.cerrada = true
  }
  cambiarEstado(estado: string) {
    this.connectionState = estado
    this.onconnectionstatechange?.()
  }
}

const persona = (uid: string, conexion: number, extra: Partial<ParticipanteLlamada> = {}): ParticipanteLlamada => ({
  uid,
  conexion,
  silenciado: false,
  hablando: false,
  reconectando: false,
  ...extra,
})

const pista = { id: 'mi-microfono' } as unknown as MediaStreamTrack
const otraPista = { id: 'otro-microfono' } as unknown as MediaStreamTrack

// espera a que terminen las promesas de webrtc
const terminar = () => act(async () => {})

const senales = (tipo: string) => socketFalso.todos('rtc:senal').filter((e) => (e.datos as { datos: { tipo: string } }).datos.tipo === tipo)

function montar(yoUid: string, participantes: ParticipanteLlamada[], extra: { miConexion?: number; pista?: MediaStreamTrack | null } = {}) {
  return renderHook((props) => useAudioLlamada(props), {
    initialProps: { yoUid, miConexion: extra.miConexion ?? 1, participantes, conectado: true, pista: extra.pista === undefined ? pista : extra.pista },
  })
}

describe('useAudioLlamada (TW 13)', () => {
  beforeEach(() => {
    socketFalso.reiniciar()
    PcFalso.todas = []
    vi.stubGlobal('RTCPeerConnection', PcFalso)
    vi.stubGlobal('MediaStream', class {
      pistas: unknown[]
      constructor(pistas: unknown[]) {
        this.pistas = pistas
      }
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('quien tiene el uid mayor ofrece audio y manda su microfono', async () => {
    montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    expect(PcFalso.todas).toHaveLength(1)
    const [pc] = PcFalso.todas
    expect(pc.transceivers[0].direction).toBe('sendrecv')
    expect(pc.transceivers[0].sender.pista).toBe(pista)
    expect(senales('oferta').map((e) => e.datos)).toEqual([{ para: 'ana', datos: { tipo: 'oferta', sdp: { type: 'offer', sdp: 'oferta' } } }])
  })

  it('quien tiene el uid menor no ofrece, espera', async () => {
    montar('ana', [persona('ana', 1), persona('beto', 5)])
    await terminar()
    expect(PcFalso.todas).toHaveLength(0)
    expect(senales('oferta')).toHaveLength(0)
  })

  it('responde una oferta con su microfono', async () => {
    montar('ana', [persona('ana', 1), persona('beto', 5)])
    await act(async () => socketFalso.disparar('rtc:senal', { de: 'beto', conexion: 5, datos: { tipo: 'oferta', sdp: { type: 'offer', sdp: 'o' } } }))
    await terminar()
    const [pc] = PcFalso.todas
    expect(pc.remoteDescription).toEqual({ type: 'offer', sdp: 'o' })
    expect(pc.transceivers[0]).toMatchObject({ direction: 'sendrecv' })
    expect(pc.transceivers[0].sender.pista).toBe(pista)
    expect(senales('respuesta').map((e) => e.datos)).toEqual([{ para: 'beto', datos: { tipo: 'respuesta', sdp: { type: 'answer', sdp: 'respuesta' } } }])
  })

  it('guarda los candidatos que llegan antes de la respuesta y los usa despues', async () => {
    montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    const [pc] = PcFalso.todas
    await act(async () => socketFalso.disparar('rtc:senal', { de: 'ana', conexion: 5, datos: { tipo: 'candidato', candidato: { candidate: 'c1' } } }))
    expect(pc.candidatos).toEqual([])
    await act(async () => socketFalso.disparar('rtc:senal', { de: 'ana', conexion: 5, datos: { tipo: 'respuesta', sdp: { type: 'answer', sdp: 'r' } } }))
    await terminar()
    expect(pc.remoteDescription).toEqual({ type: 'answer', sdp: 'r' })
    expect(pc.candidatos).toEqual([{ candidate: 'c1' }])
  })

  it('manda mis candidatos y guarda el audio que llega', async () => {
    const { result } = montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    const [pc] = PcFalso.todas
    act(() => pc.onicecandidate!({ candidate: { toJSON: () => ({ candidate: 'mio' }) } }))
    expect(senales('candidato').map((e) => e.datos)).toEqual([{ para: 'ana', datos: { tipo: 'candidato', candidato: { candidate: 'mio' } } }])
    const stream = { id: 'audio-de-ana' }
    act(() => pc.ontrack!({ streams: [stream], track: {} }))
    expect(result.current.remotos).toEqual({ ana: stream })
  })

  it('cierra la conexion cuando la persona sale de la sala', async () => {
    const { rerender, result } = montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    rerender({ yoUid: 'beto', miConexion: 1, participantes: [persona('beto', 1)], conectado: true, pista })
    expect(PcFalso.todas[0].cerrada).toBe(true)
    expect(result.current.remotos).toEqual({})
  })

  it('si la otra persona vuelve a entrar se rehace el audio', async () => {
    const { rerender } = montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    rerender({ yoUid: 'beto', miConexion: 1, participantes: [persona('ana', 9), persona('beto', 1)], conectado: true, pista })
    await terminar()
    expect(PcFalso.todas).toHaveLength(2)
    expect(PcFalso.todas[0].cerrada).toBe(true)
    expect(senales('oferta')).toHaveLength(2)
  })

  it('mientras alguien reconecta no se le ofrece audio', async () => {
    montar('beto', [persona('ana', 5, { reconectando: true }), persona('beto', 1)])
    await terminar()
    expect(PcFalso.todas).toHaveLength(0)
  })

  it('si la conexion falla se vuelve a intentar', async () => {
    montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    act(() => PcFalso.todas[0].cambiarEstado('failed'))
    await terminar()
    expect(PcFalso.todas).toHaveLength(2)
    expect(PcFalso.todas[0].cerrada).toBe(true)
  })

  it('cambiar de microfono cambia la pista sin rehacer la conexion', async () => {
    const { rerender } = montar('beto', [persona('ana', 5), persona('beto', 1)])
    await terminar()
    rerender({ yoUid: 'beto', miConexion: 1, participantes: [persona('ana', 5), persona('beto', 1)], conectado: true, pista: otraPista })
    await terminar()
    expect(PcFalso.todas).toHaveLength(1)
    expect(PcFalso.todas[0].transceivers[0].sender.pista).toBe(otraPista)
  })

  it('sin microfono igual se conecta para escuchar a los demas', async () => {
    montar('beto', [persona('ana', 5), persona('beto', 1)], { pista: null })
    await terminar()
    expect(PcFalso.todas[0].transceivers[0].sender.pista).toBeNull()
    expect(senales('oferta')).toHaveLength(1)
  })

  it('al salir de la llamada cierra todo', async () => {
    const { unmount } = montar('beto', [persona('ana', 5), persona('caro', 6), persona('beto', 1)])
    await terminar()
    expect(PcFalso.todas).toHaveLength(1)
    unmount()
    expect(PcFalso.todas.every((pc) => pc.cerrada)).toBe(true)
  })
})
