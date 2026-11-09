import { useEffect, useRef, useState } from 'react'
import { obtenerSocket } from '../lib/socket'
import type { ParticipanteLlamada } from '../types'

// servidores stun gratis para encontrar el camino entre dos navegadores
const SERVIDORES_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
// turn opcional, para redes que bloquean la conexion directa
if (import.meta.env.VITE_TURN_URL) {
  SERVIDORES_ICE.push({ urls: import.meta.env.VITE_TURN_URL, username: import.meta.env.VITE_TURN_USUARIO, credential: import.meta.env.VITE_TURN_CLAVE })
}

type Senal =
  | { tipo: 'oferta'; sdp: RTCSessionDescriptionInit }
  | { tipo: 'respuesta'; sdp: RTCSessionDescriptionInit }
  | { tipo: 'candidato'; candidato: RTCIceCandidateInit }

interface Par {
  pc: RTCPeerConnection
  // mi conexion y la suya cuando se creo; si cambia alguna hay que rehacerlo
  clave: string
  // candidatos que llegaron antes que la oferta o la respuesta
  pendientes: RTCIceCandidateInit[]
}

interface Opciones {
  yoUid: string
  miConexion: number
  participantes: ParticipanteLlamada[]
  conectado: boolean
  pista: MediaStreamTrack | null
}

const sin = <T,>(mapa: Record<string, T>, clave: string): Record<string, T> => {
  const copia = { ...mapa }
  delete copia[clave]
  return copia
}

/**
 * Audio entre personas con webrtc (TW 13). Cada par de personas tiene su conexion directa.
 * Para no chocar, siempre ofrece la persona con el uid "mayor" y la otra responde.
 * El servidor de socket.io solo pasa los mensajes (oferta, respuesta y candidatos).
 */
export function useAudioLlamada({ yoUid, miConexion, participantes, conectado, pista }: Opciones) {
  const pares = useRef(new Map<string, Par>())
  const pistaRef = useRef(pista)
  const [remotos, setRemotos] = useState<Record<string, MediaStream>>({})
  const [estados, setEstados] = useState<Record<string, RTCPeerConnectionState>>({})
  // cambia este numero para volver a intentar cuando una conexion falla
  const [reintento, setReintento] = useState(0)

  const mandar = (para: string, datos: Senal) => obtenerSocket().emit('rtc:senal', { para, datos })

  function cerrar(uid: string) {
    const par = pares.current.get(uid)
    if (!par) return
    pares.current.delete(uid)
    par.pc.onicecandidate = null
    par.pc.ontrack = null
    par.pc.onconnectionstatechange = null
    par.pc.close()
    setRemotos((r) => sin(r, uid))
    setEstados((e) => sin(e, uid))
  }

  function crearPar(uid: string, clave: string): Par {
    const pc = new RTCPeerConnection({ iceServers: SERVIDORES_ICE })
    const par: Par = { pc, clave, pendientes: [] }
    pares.current.set(uid, par)

    pc.onicecandidate = (e) => {
      if (e.candidate) mandar(uid, { tipo: 'candidato', candidato: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      setRemotos((r) => ({ ...r, [uid]: stream }))
    }
    pc.onconnectionstatechange = () => {
      if (pares.current.get(uid) !== par) return
      setEstados((e) => ({ ...e, [uid]: pc.connectionState }))
      // si fallo, se cierra y se vuelve a intentar
      if (pc.connectionState === 'failed') {
        cerrar(uid)
        setReintento((n) => n + 1)
      }
    }
    return par
  }

  async function usarCandidatosPendientes(par: Par) {
    for (const c of par.pendientes.splice(0)) await par.pc.addIceCandidate(c).catch(() => {})
  }

  async function ofrecer(uid: string, clave: string) {
    const par = crearPar(uid, clave)
    try {
      const t = par.pc.addTransceiver('audio', { direction: 'sendrecv' })
      await t.sender.replaceTrack(pistaRef.current)
      const oferta = await par.pc.createOffer()
      if (pares.current.get(uid) !== par) return
      await par.pc.setLocalDescription(oferta)
      mandar(uid, { tipo: 'oferta', sdp: { type: oferta.type, sdp: oferta.sdp } })
    } catch (error) {
      console.warn('no se pudo ofrecer audio', error)
      cerrar(uid)
    }
  }

  // senales que llegan de las demas personas
  useEffect(() => {
    const socket = obtenerSocket()

    const alRecibir = async ({ de, conexion, datos }: { de: string; conexion: number; datos: Senal }) => {
      try {
        if (datos.tipo === 'oferta') {
          // una oferta nueva reemplaza lo que hubiera con esa persona
          cerrar(de)
          const par = crearPar(de, String(conexion))
          await par.pc.setRemoteDescription(datos.sdp)
          const t = par.pc.getTransceivers()[0]
          if (t) {
            t.direction = 'sendrecv'
            await t.sender.replaceTrack(pistaRef.current)
          }
          const respuesta = await par.pc.createAnswer()
          if (pares.current.get(de) !== par) return
          await par.pc.setLocalDescription(respuesta)
          mandar(de, { tipo: 'respuesta', sdp: { type: respuesta.type, sdp: respuesta.sdp } })
          await usarCandidatosPendientes(par)
        } else if (datos.tipo === 'respuesta') {
          const par = pares.current.get(de)
          if (!par || par.pc.signalingState !== 'have-local-offer') return
          await par.pc.setRemoteDescription(datos.sdp)
          await usarCandidatosPendientes(par)
        } else if (datos.tipo === 'candidato') {
          const par = pares.current.get(de)
          if (!par) return
          if (par.pc.remoteDescription) await par.pc.addIceCandidate(datos.candidato).catch(() => {})
          else par.pendientes.push(datos.candidato)
        }
      } catch (error) {
        console.warn('error en la senal de audio', error)
        cerrar(de)
      }
    }

    socket.on('rtc:senal', alRecibir)
    return () => {
      socket.off('rtc:senal', alRecibir)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // abre o cierra conexiones segun quien esta en la sala
  useEffect(() => {
    if (!conectado || !miConexion) return
    const presentes = new Map(participantes.filter((p) => p.uid !== yoUid).map((p) => [p.uid, p]))

    for (const uid of [...pares.current.keys()]) {
      if (!presentes.has(uid)) cerrar(uid)
    }
    for (const p of presentes.values()) {
      if (p.reconectando) continue
      // solo ofrece quien tiene el uid mayor; el otro espera la oferta
      if (yoUid < p.uid) continue
      const clave = `${miConexion}-${p.conexion}`
      const par = pares.current.get(p.uid)
      if (par && par.clave !== clave) cerrar(p.uid)
      if (!pares.current.get(p.uid)) ofrecer(p.uid, clave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado, miConexion, participantes, yoUid, reintento])

  // si cambia el microfono (otro dispositivo o se dio permiso tarde) se cambia la pista sin renegociar
  useEffect(() => {
    pistaRef.current = pista
    for (const par of pares.current.values()) {
      par.pc.getTransceivers()[0]?.sender.replaceTrack(pista).catch(() => {})
    }
  }, [pista])

  // al salir de la sala se cierra todo
  useEffect(() => {
    const mapa = pares.current
    return () => {
      for (const par of mapa.values()) par.pc.close()
      mapa.clear()
    }
  }, [])

  return { remotos, estados }
}
