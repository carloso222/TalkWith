import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
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

/**
 * Invitaciones creadas en esta pestaña (las reglas no permiten listarlas). La clave incluye el uid
 * de la sesión para que otra cuenta que entre después en la misma pestaña no vea los códigos.
 */
const creadas = new Map<string, Invitacion>()
const claveCreada = (servidorId: string): string => `${uidDe()}/${servidorId}`

export const recordarInvitacion = (invitacion: Invitacion): void => {
  creadas.set(claveCreada(invitacion.servidorId), invitacion)
}

/** Enlace completo para compartir una invitacion. */
export const enlaceInvitacion = (codigo: string): string => `talkwith.app/i/${codigo}`

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
  /** Invitacion creada en esta sesión para un servidor (no se puede listar desde Firestore). */
  getByServer: (servidorId: string): Promise<Invitacion | null> => Promise.resolve(creadas.get(claveCreada(servidorId)) ?? null),
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
