import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { validarCanal, type DatosCanal } from '../lib/validaciones'
import * as mocks from '../mocks/data'
import { useDatosStore } from '../store/datosStore'
import type { Canal } from '../types'
import { ApiError } from './errores'
import { aApiError } from './firestore/errores'
import { crearSlug, sufijoAleatorio } from './firestore/identificadores'
import { rolEn, uidDe } from './firestore/vistas'

const listar = (servidorId: string): Canal[] => useDatosStore.getState().canales[servidorId] ?? []

/** Solo propietario y admin gestionan canales (igual que las reglas). */
function exigirGestor(servidorId: string): void {
  const rol = rolEn(servidorId, uidDe())
  if (rol !== 'propietario' && rol !== 'admin') throw new ApiError(403, 'No tienes permiso para hacer esto.')
}

// revisa los datos igual que lo haria el backend
function revisarCanal(servidorId: string, datos: DatosCanal, canalId?: string): void {
  const errores = validarCanal(datos)
  if (errores.nombre) throw new ApiError(400, errores.nombre, 'nombre')
  if (errores.descripcion) throw new ApiError(400, errores.descripcion, 'descripcion')
  const nombre = datos.nombre.trim().toLowerCase()
  if (listar(servidorId).some((c) => c.canalId !== canalId && c.nombre.toLowerCase() === nombre)) {
    throw new ApiError(409, 'Ya existe un canal con ese nombre en este servidor.', 'nombre')
  }
}

/** Documento de Firestore: sin claves `undefined` y solo las que permiten las reglas. */
type DocCanal = Omit<Canal, 'canalId' | 'menciones'>

function aDocumento(servidorId: string, datos: DatosCanal): DocCanal {
  const descripcion = datos.descripcion.trim()
  return {
    servidorId,
    nombre: datos.nombre.trim(),
    tipo: datos.tipo,
    ...(descripcion ? { descripcion } : {}),
    privado: datos.privado,
  }
}

async function guardar(servidorId: string, canalId: string, datos: DatosCanal): Promise<Canal> {
  const documento = aDocumento(servidorId, datos)
  try {
    await setDoc(doc(db, 'servidores', servidorId, 'canales', canalId), documento)
  } catch (e) {
    throw aApiError(e)
  }
  return { canalId, ...documento }
}

const buscar = (canalId: string): Canal | undefined =>
  Object.values(useDatosStore.getState().canales).flat().find((c) => c.canalId === canalId)

export const channelService = {
  getByServer: (servidorId: string): Promise<Canal[]> => Promise.resolve([...listar(servidorId)]),
  getById: (canalId: string): Promise<Canal> => {
    const canal = buscar(canalId)
    return canal ? Promise.resolve(canal) : Promise.reject(new ApiError(404, 'El canal no existe o fue eliminado.'))
  },
  create: async (servidorId: string, datos: DatosCanal): Promise<Canal> => {
    exigirGestor(servidorId)
    revisarCanal(servidorId, datos)
    const canalId = `${crearSlug(datos.nombre, false).slice(0, 30) || 'canal'}-${sufijoAleatorio(6)}`
    return guardar(servidorId, canalId, datos)
  },
  update: async (canalId: string, datos: DatosCanal): Promise<Canal> => {
    const actual = buscar(canalId)
    if (!actual) throw new ApiError(404, 'El canal no existe o fue eliminado.')
    exigirGestor(actual.servidorId)
    revisarCanal(actual.servidorId, datos, canalId)
    return guardar(actual.servidorId, canalId, datos)
  },
  remove: async (canalId: string): Promise<void> => {
    const actual = buscar(canalId)
    if (!actual) throw new ApiError(404, 'El canal ya había sido eliminado.')
    exigirGestor(actual.servidorId)
    try {
      await deleteDoc(doc(db, 'servidores', actual.servidorId, 'canales', canalId))
    } catch (e) {
      throw aApiError(e)
    }
  },
  listByServer: (servidorId: string): Canal[] => listar(servidorId),
  find: (canalId: string): Canal | undefined => buscar(canalId),
  inCall: (canalId: string): string[] => mocks.enLlamada[canalId] ?? [],
  isMuted: (uid: string): boolean => mocks.silenciados.includes(uid),
  /** Menciones al usuario en un canal, contadas a partir de los mensajes. */
  mentions: (canalId: string, uid?: string): number =>
    mocks.mensajes.filter((m) => m.canalId === canalId && m.menciones?.includes(uidDe(uid))).length,
  readIds: (): string[] => mocks.canalesLeidos,
  /** Personas escribiendo ahora mismo en un canal de texto. */
  typing: (canalId: string): string[] => mocks.escribiendo[canalId] ?? [],
}
