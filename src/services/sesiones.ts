import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { terminos } from '../lib/texto'
import { fechaSesion, horaTexto } from '../lib/time'
import * as mocks from '../mocks/data'
import type { Consentimiento, EstadoConsentimiento, Segmento, SesionVoz } from '../types'
import { ApiError } from './errores'
import { aApiError } from './firestore/errores'
import { uidDe } from './firestore/vistas'

// el historial muestra las sesiones mas recientes
const MAX_SESIONES = 100
const MAX_TEXTO_SEGMENTO = 1000
const GRABACIONES: SesionVoz['grabacion'][] = ['grabada', 'procesando', 'sin-grabacion']
const ESTADOS: EstadoConsentimiento[] = ['pendiente', 'aceptado', 'rechazado']

const rutaSesiones = (servidorId: string) => collection(db, 'servidores', servidorId, 'sesiones')
const rutaSegmentos = (servidorId: string, sesionId: string) => collection(db, 'servidores', servidorId, 'sesiones', sesionId, 'segmentos')

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')

// las fechas que aun no confirma el servidor se estiman con la hora local
const datosDe = (snap: DocumentSnapshot) => snap.data({ serverTimestamps: 'estimate' }) ?? {}

function aSesion(snap: DocumentSnapshot): SesionVoz {
  const d = datosDe(snap)
  const inicio = d.inicio?.toDate ? d.inicio.toDate() : null
  return {
    sesionId: snap.id,
    servidorId: texto(d.servidorId),
    canalId: texto(d.canalId),
    inicio: inicio ? fechaSesion(inicio) : '',
    // el servidor pone la duracion cuando la sala se queda vacia
    duracion: texto(d.duracion) || 'En curso',
    participantes: Array.isArray(d.participantes) ? d.participantes.filter((u: unknown) => typeof u === 'string') : [],
    totalSegmentos: typeof d.totalSegmentos === 'number' ? d.totalSegmentos : 0,
    grabacion: GRABACIONES.includes(d.grabacion) ? d.grabacion : 'sin-grabacion',
  }
}

function aSegmento(snap: DocumentSnapshot): Segmento {
  const d = datosDe(snap)
  return {
    segmentoId: snap.id,
    sesionId: texto(d.sesionId),
    hablanteUid: texto(d.hablanteUid),
    texto: texto(d.texto),
    marcaTiempo: texto(d.marcaTiempo),
  }
}

// segmentos en el orden en que se dijeron
const consultaSegmentos = (servidorId: string, sesionId: string) => query(rutaSegmentos(servidorId, sesionId), orderBy('creadoEn'))

export const sessionService = {
  getByServer: async (servidorId: string): Promise<SesionVoz[]> => {
    if (!servidorId) return []
    try {
      const snap = await getDocs(query(rutaSesiones(servidorId), orderBy('inicio', 'desc'), limit(MAX_SESIONES)))
      return snap.docs.map(aSesion)
    } catch (e) {
      throw aApiError(e)
    }
  },

  getById: async (servidorId: string, sesionId: string): Promise<SesionVoz | null> => {
    if (!servidorId || !sesionId) return null
    try {
      const snap = await getDoc(doc(db, 'servidores', servidorId, 'sesiones', sesionId))
      return snap.exists() ? aSesion(snap) : null
    } catch (e) {
      throw aApiError(e)
    }
  },

  getSegments: async (servidorId: string, sesionId: string): Promise<Segmento[]> => {
    if (!servidorId || !sesionId) return []
    try {
      const snap = await getDocs(consultaSegmentos(servidorId, sesionId))
      return snap.docs.map(aSegmento)
    } catch (e) {
      throw aApiError(e)
    }
  },

  /** Transcripcion en vivo: avisa cada vez que llega un segmento. Regresa la funcion para dejar de escuchar. */
  listenSegments: (servidorId: string, sesionId: string, alCambiar: (segmentos: Segmento[]) => void): (() => void) =>
    onSnapshot(
      consultaSegmentos(servidorId, sesionId),
      (snap) => alCambiar(snap.docs.map(aSegmento)),
      () => alCambiar([]),
    ),

  /**
   * Guarda lo que dijo el usuario actual. Lo usara el reconocimiento de voz (TW 15).
   * Tambien suma uno al total de segmentos de la sesion.
   */
  addSegment: async (servidorId: string, sesionId: string, dicho: string): Promise<string> => {
    const limpio = dicho.trim().slice(0, MAX_TEXTO_SEGMENTO)
    if (!limpio) throw new ApiError(400, 'El segmento está vacío.')
    const ref = doc(rutaSegmentos(servidorId, sesionId))
    const batch = writeBatch(db)
    batch.set(ref, {
      servidorId,
      sesionId,
      hablanteUid: uidDe(),
      texto: limpio,
      marcaTiempo: horaTexto(new Date()),
      creadoEn: serverTimestamp(),
      // palabras sin repetir para la busqueda (las reglas aceptan hasta 50)
      terminos: [...new Set(terminos(limpio))].slice(0, 50),
    })
    batch.update(doc(db, 'servidores', servidorId, 'sesiones', sesionId), { totalSegmentos: increment(1) })
    try {
      await batch.commit()
    } catch (e) {
      throw aApiError(e)
    }
    return ref.id
  },

  getConsents: async (servidorId: string, sesionId: string): Promise<Consentimiento[]> => {
    try {
      const snap = await getDocs(collection(db, 'servidores', servidorId, 'sesiones', sesionId, 'consentimientos'))
      return snap.docs.map((d) => {
        const datos = d.data()
        return { sesionId, uid: d.id, estado: ESTADOS.includes(datos.estado) ? datos.estado : 'pendiente' }
      })
    } catch (e) {
      throw aApiError(e)
    }
  },

  // todavia no se mide cuanto hablo cada quien, solo hay datos de ejemplo
  speakingTime: (sesionId: string): Record<string, string> => mocks.tiempoHablado[sesionId] ?? {},
}
