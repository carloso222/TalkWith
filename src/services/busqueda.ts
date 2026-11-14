import { collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, where, type DocumentData } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { normalizar, terminos } from '../lib/texto'
import { fechaSesion } from '../lib/time'
import type { ResultadoBusqueda } from '../types'
import { channelService } from './canales'
import { ApiError } from './errores'
import { aApiError } from './firestore/errores'
import { servidoresDe, uidDe } from './firestore/vistas'
import { userService } from './userService'

/**
 * TW 11 · Búsqueda de mensajes y transcripciones en Firestore.
 *
 * Mensajes y segmentos guardan `terminos` (palabras normalizadas de más de 3 letras). Por cada
 * servidor del usuario se consulta la palabra más larga de la búsqueda con `array-contains` y el
 * resto se filtra aquí. Filtrar por `servidorId` es obligatorio: las reglas solo dejan leer
 * documentos de servidores donde el usuario es miembro, así que nunca aparecen datos ajenos.
 * Índices: `firestore.indexes.json` (servidorId + terminos + creadoEn desc).
 */

// resultados por servidor y tipo antes de filtrar; suficiente para un MVP de grupos pequeños
const POR_CONSULTA = 30
const MAX_RESULTADOS = 50

const fechaDe = (d: DocumentData): Date | null => {
  const v = d.creadoEn
  return v && typeof v.toDate === 'function' ? v.toDate() : null
}

const contieneTodas = (texto: string, palabras: string[]) => {
  const limpio = normalizar(texto)
  return palabras.every((p) => limpio.includes(p))
}

interface Encontrado extends ResultadoBusqueda {
  fechaMs: number
}

async function buscarEnServidor(sid: string, servidorNombre: string, clave: string, palabras: string[]): Promise<Encontrado[]> {
  const filtros = [where('servidorId', '==', sid), where('terminos', 'array-contains', clave), orderBy('creadoEn', 'desc'), limit(POR_CONSULTA)]
  const [mensajes, segmentos] = await Promise.all([
    getDocs(query(collectionGroup(db, 'mensajes'), ...filtros)),
    getDocs(query(collectionGroup(db, 'segmentos'), ...filtros)),
  ])

  const resultados: Encontrado[] = []
  for (const snap of mensajes.docs) {
    const d = snap.data()
    const contenido = typeof d.contenido === 'string' ? d.contenido : ''
    if (!contenido || !contieneTodas(contenido, palabras)) continue
    const fecha = fechaDe(d)
    const canalId = String(d.canalId ?? '')
    resultados.push({
      resultadoId: `m-${sid}-${snap.id}`,
      tipo: 'mensaje',
      servidorNombre,
      ubicacion: `#${channelService.find(canalId)?.nombre ?? canalId}`,
      autorUid: String(d.autorUid ?? ''),
      fragmento: contenido,
      cuando: fecha ? fechaSesion(fecha) : '',
      fechaMs: fecha?.getTime() ?? 0,
      ruta: `/app/s/${sid}/c/${canalId}`,
    })
  }

  // un segmento solo trae su sesión; el canal de voz se lee una vez por sesión
  const canalDeSesion = new Map<string, Promise<string>>()
  const ubicacionDe = (sesionId: string) => {
    if (!canalDeSesion.has(sesionId)) {
      canalDeSesion.set(
        sesionId,
        getDoc(doc(db, 'servidores', sid, 'sesiones', sesionId))
          .then((s) => {
            const canalId = String(s.data()?.canalId ?? '')
            return channelService.find(canalId)?.nombre ?? (canalId || 'Llamada de voz')
          })
          .catch(() => 'Llamada de voz'),
      )
    }
    return canalDeSesion.get(sesionId)!
  }
  for (const snap of segmentos.docs) {
    const d = snap.data()
    const texto = typeof d.texto === 'string' ? d.texto : ''
    if (!texto || !contieneTodas(texto, palabras)) continue
    const fecha = fechaDe(d)
    const sesionId = String(d.sesionId ?? '')
    resultados.push({
      resultadoId: `t-${sid}-${snap.id}`,
      tipo: 'transcripcion',
      servidorNombre,
      ubicacion: await ubicacionDe(sesionId),
      autorUid: String(d.hablanteUid ?? ''),
      fragmento: texto,
      cuando: fecha ? fechaSesion(fecha) : String(d.marcaTiempo ?? ''),
      fechaMs: fecha?.getTime() ?? 0,
      ruta: `/app/s/${sid}/sesiones/${sesionId}`,
    })
  }
  return resultados
}

export const searchService = {
  /** Mensajes y transcripciones de los servidores del usuario que contienen todas las palabras, del más reciente al más antiguo. */
  search: async (q: string): Promise<ResultadoBusqueda[]> => {
    const palabras = [...new Set(terminos(q))]
    if (!palabras.length) return []
    // la palabra más larga suele ser la más distintiva y deja menos documentos por filtrar
    const clave = [...palabras].sort((a, b) => b.length - a.length)[0]
    const servidores = servidoresDe(uidDe())

    let porServidor: Encontrado[][]
    try {
      porServidor = await Promise.all(servidores.map((s) => buscarEnServidor(s.servidorId, s.nombre, clave, palabras)))
    } catch (e) {
      // sin el índice compuesto desplegado, Firestore rechaza la consulta con failed-precondition
      if ((e as { code?: string } | null)?.code === 'failed-precondition') {
        throw new ApiError(503, 'La búsqueda todavía se está preparando. Inténtalo de nuevo en unos minutos.')
      }
      throw aApiError(e)
    }
    const resultados = porServidor
      .flat()
      .sort((a, b) => b.fechaMs - a.fechaMs)
      .slice(0, MAX_RESULTADOS)

    // nombres y avatares de quienes aparecen, para la tarjeta y el filtro de personas
    await Promise.all([...new Set(resultados.map((r) => r.autorUid))].filter(Boolean).map((uid) => userService.getById(uid)))
    return resultados
  },
}
