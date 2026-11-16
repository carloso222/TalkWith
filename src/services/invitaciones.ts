import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useDatosStore } from '../store/datosStore'
import type { Invitacion, Servidor } from '../types'
import { ApiError } from './errores'
import { aPrevia, expiraEn } from './firestore/convertidores'
import { aApiError } from './firestore/errores'
import { esperarServidor } from './firestore/escuchas'
import { crearSlug, sufijoAleatorio } from './firestore/identificadores'
import { rolEn, servidorDe, uidDe } from './firestore/vistas'
import { userService } from './userService'

const PATRON_CODIGO = /^[a-z0-9-]{12,64}$/
const MSJ_INVALIDA = 'El enlace no es válido o ya expiró. Pide uno nuevo a quien te invitó.'

/** Cuánto dura una invitación (las reglas aceptan hasta 8 días). */
export const VIGENCIA_INVITACION_MS = 7 * 24 * 3_600_000

/**
 * Invitaciones creadas en esta pestaña (las reglas no permiten listarlas). La clave incluye el uid
 * de la sesión para que otra cuenta que entre después en la misma pestaña no vea los códigos.
 */
const creadas = new Map<string, { invitacion: Invitacion; venceMs: number }>()
const claveCreada = (servidorId: string): string => `${uidDe()}/${servidorId}`

export const recordarInvitacion = (invitacion: Invitacion, venceMs = Date.now() + VIGENCIA_INVITACION_MS): void => {
  creadas.set(claveCreada(invitacion.servidorId), { invitacion, venceMs })
}

/**
 * Documento de una invitación nueva. La vista previa copia el nombre, las iniciales y el color
 * del servidor tal cual, porque las reglas lo exigen (evita invitaciones que suplantan a otro).
 */
export function documentoInvitacion(servidorId: string, servidor: Pick<Servidor, 'nombre' | 'iniciales' | 'color'>, uid: string) {
  return {
    servidorId,
    invitaUid: uid,
    creadaEn: serverTimestamp(),
    expiraEn: Timestamp.fromMillis(Date.now() + VIGENCIA_INVITACION_MS),
    servidorNombre: servidor.nombre,
    servidorIniciales: servidor.iniciales,
    servidorColor: servidor.color,
  }
}

/** Enlace completo para compartir una invitación, con el dominio donde corre la app. */
export const enlaceInvitacion = (codigo: string): string => {
  const origen = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://talkwith.app'
  return `${origen}/i/${codigo}`
}

// acepta el enlace completo (talkwith.app/i/codigo) o solo el codigo
export const leerCodigo = (texto: string): string => texto.trim().split('/').pop()?.toLowerCase() ?? ''

/** Código tipo "club-diseno-ux-k3m9x2q7vb4n": nombre (hasta 40) + 12 símbolos de `crypto` (unos 59 bits). */
export function crearCodigo(nombre: string): string {
  const base = crearSlug(nombre).slice(0, 40).replace(/-$/, '')
  return `${base || 'servidor'}-${sufijoAleatorio(12)}`
}

interface Validada {
  invitacion: Invitacion
  codigo: string
  previa: Servidor
}

async function validar(texto: string): Promise<Validada | null> {
  const codigo = leerCodigo(texto)
  if (!PATRON_CODIGO.test(codigo)) return null
  let snap
  try {
    snap = await getDoc(doc(db, 'invitaciones', codigo))
  } catch (e) {
    throw aApiError(e)
  }
  if (!snap.exists()) return null
  const d = snap.data()
  if (typeof d.servidorId !== 'string' || !d.expiraEn?.toMillis || d.expiraEn.toMillis() <= Date.now()) return null
  const previa = aPrevia(d)
  if (!rolEn(previa.servidorId, uidDe())) useDatosStore.getState().ponerPrevia(previa.servidorId, previa)
  await userService.getById(previa.propietarioUid)
  const invitacion: Invitacion = {
    codigo,
    servidorId: previa.servidorId,
    invitaUid: previa.propietarioUid,
    expiraEn: expiraEn(d.expiraEn),
    enLinea: 0,
    enLlamada: 0,
  }
  return { invitacion, codigo, previa }
}

export const inviteService = {
  validate: async (texto: string): Promise<Invitacion | null> => (await validar(texto))?.invitacion ?? null,
  /** Invitación vigente creada en esta sesión para un servidor (no se puede listar desde Firestore). */
  getByServer: (servidorId: string): Promise<Invitacion | null> => {
    const guardada = creadas.get(claveCreada(servidorId))
    // con menos de un minuto de vida ya no vale la pena compartirla
    if (!guardada || guardada.venceMs - Date.now() <= 60_000) return Promise.resolve(null)
    // el texto de vigencia se recalcula: pudo crearse hace horas
    return Promise.resolve({ ...guardada.invitacion, expiraEn: expiraEn(Timestamp.fromMillis(guardada.venceMs)) })
  },

  /** Crea una invitación nueva de 7 días. Solo propietario y admin (igual que las reglas). */
  create: async (servidorId: string, uid?: string): Promise<Invitacion> => {
    const yo = uidDe(uid)
    const servidor = servidorDe(servidorId)
    if (!servidor) throw new ApiError(404, 'El servidor no existe o ya fue eliminado.')
    const rol = rolEn(servidorId, yo)
    if (rol !== 'propietario' && rol !== 'admin') throw new ApiError(403, 'Solo propietarios y admins pueden invitar personas.')
    const codigo = crearCodigo(servidor.nombre)
    const datos = documentoInvitacion(servidorId, servidor, yo)
    try {
      await setDoc(doc(db, 'invitaciones', codigo), datos)
    } catch (e) {
      throw aApiError(e)
    }
    const invitacion: Invitacion = { codigo, servidorId, invitaUid: yo, expiraEn: '7 días', enLinea: 0, enLlamada: 0 }
    recordarInvitacion(invitacion, datos.expiraEn.toMillis())
    return invitacion
  },
  /** Agrega al usuario como miembro del servidor de la invitacion y espera a verlo en la caché. */
  join: async (texto: string, uid?: string): Promise<Servidor> => {
    const yo = uidDe(uid)
    const valida = await validar(texto)
    if (!valida) throw new ApiError(404, MSJ_INVALIDA)
    const sid = valida.invitacion.servidorId
    if (rolEn(sid, yo)) throw new ApiError(409, `Ya eres miembro de ${valida.previa.nombre}.`)
    try {
      await setDoc(doc(db, 'servidores', sid, 'miembros', yo), {
        uid: yo,
        servidorId: sid,
        rol: 'miembro',
        unidoEn: serverTimestamp(),
        correo: auth.currentUser?.email ?? '',
        codigoInvitacion: valida.codigo,
      })
    } catch (e) {
      throw aApiError(e)
    }
    await esperarServidor(sid)
    const servidor = servidorDe(sid)
    if (!servidor || !rolEn(sid, yo)) throw new ApiError(503, 'Te uniste, pero no pudimos cargar el servidor. Recarga la página.')
    return servidor
  },
}
