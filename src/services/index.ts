/**
 * Servicios de datos.
 *
 * Esta entrega NO hace peticiones a ninguna API: cada función devuelve datos
 * de /mocks envueltos en una Promise con un pequeño retardo, para que las
 * vistas ya se escriban como si los datos vinieran del servidor.
 * En la siguiente entrega solo se reemplaza el cuerpo de estas funciones
 * por llamadas a Firebase / Socket.io; las vistas no cambian.
 *
 * Úsalos en componentes con el hook `useService` (src/hooks/useService.ts).
 */
import { validarCanal, validarServidor, type DatosCanal, type DatosServidor } from '../lib/validaciones'
import * as db from '../mocks/data'
import type { Canal, Grabacion, Invitacion, Mensaje, Miembro, ResumenInicio, ResumenServidor, Servidor, SesionVoz, Usuario } from '../types'
import { ApiError } from './errores'

export { ApiError, manejarError, mensajeDeError } from './errores'

const LATENCIA_MS = 250

function simular<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), LATENCIA_MS))
}

/* ---------- Autenticacion ---------- */

// cuenta de prueba: correo del usuario demo y esta contrasena
export const CONTRASENA_DEMO = 'talkwith123'

export const authService = {
  login: (correo: string, contrasena: string): Promise<Usuario> =>
    responder(() => {
      const usuario = db.usuarios.find((u) => u.uid === db.CURRENT_UID)
      const coincide = usuario && usuario.correo === correo.trim().toLowerCase() && contrasena === CONTRASENA_DEMO
      if (!usuario || !coincide) throw new ApiError(401, 'Correo o contraseña incorrectos.')
      return usuario
    }),
  registrar: (datos: { nombre: string; usuario: string }): Promise<Usuario> =>
    responder(() => {
      const usuario = datos.usuario.replace(/^@/, '')
      const ocupado = db.usuarios.some((u) => u.usuario === usuario && u.uid !== db.CURRENT_UID)
      if (ocupado) throw new ApiError(409, 'Ese nombre de usuario ya está en uso.', 'usuario')
      const actual = db.usuarios.find((u) => u.uid === db.CURRENT_UID)!
      return { ...actual, nombre: datos.nombre.trim(), usuario }
    }),
}

/* ---------- Usuarios ---------- */
export const userService = {
  getAll: () => simular(db.usuarios),
  getById: (uid: string) => simular(db.usuarios.find((u) => u.uid === uid) ?? null),
  /** Acceso síncrono para pintar avatares y nombres sin estado de carga. */
  find: (uid: string): Usuario | undefined => db.usuarios.find((u) => u.uid === uid),
}

/* ---------- Guardado local ---------- */

// lee una lista de localStorage, si no hay usa los datos de ejemplo
function cargarLista<T>(clave: string, inicial: T[]): T[] {
  const guardada = localStorage.getItem(clave)
  if (guardada) return JSON.parse(guardada)
  return [...inicial]
}

function guardarLista<T>(clave: string, lista: T[]) {
  localStorage.setItem(clave, JSON.stringify(lista))
}

/* ---------- Servidores ---------- */

const CLAVE_SERVIDORES = 'talkwith-servidores'
const CLAVE_MIEMBROS = 'talkwith-miembros'
const CLAVE_INVITACIONES = 'talkwith-invitaciones'

let listaServidores = cargarLista(CLAVE_SERVIDORES, db.servidores)
let listaMiembros = cargarLista(CLAVE_MIEMBROS, db.miembros)
let listaInvitaciones = cargarLista(CLAVE_INVITACIONES, db.invitaciones)

const COLORES_SERVIDOR = ['#6366f1', '#ec4899', '#16a34a', '#d97706', '#0ea5e9', '#8b5cf6', '#ef4444']

// "Club de Diseño UX" -> "CD"
function crearIniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/)
  const letras = palabras.length > 1 ? palabras[0][0] + palabras[1][0] : palabras[0].slice(0, 2)
  return letras.toUpperCase()
}

// "Club de Diseño UX" -> "club-diseno-ux"
function crearSlug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(de|del|la|el|y)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// codigo tipo "club-diseno-ux-9QF1"
function crearCodigo(nombre: string) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let sufijo = ''
  for (let i = 0; i < 4; i++) sufijo += letras[Math.floor(Math.random() * letras.length)]
  return `${crearSlug(nombre) || 'servidor'}-${sufijo}`
}

// revisa los datos igual que lo haria el backend
function revisarServidor(datos: DatosServidor, uid: string) {
  const errores = validarServidor(datos)
  if (errores.nombre) throw new ApiError(400, errores.nombre, 'nombre')
  if (errores.descripcion) throw new ApiError(400, errores.descripcion, 'descripcion')

  const misIds = listaMiembros.filter((m) => m.uid === uid).map((m) => m.servidorId)
  const nombre = datos.nombre.trim().toLowerCase()
  const repetido = listaServidores.some((s) => misIds.includes(s.servidorId) && s.nombre.toLowerCase() === nombre)
  if (repetido) throw new ApiError(409, 'Ya perteneces a un servidor con ese nombre.', 'nombre')
}

/** Enlace completo para compartir una invitacion. */
export const enlaceInvitacion = (codigo: string) => `talkwith.app/i/${codigo}`

export const serverService = {
  getMine: (uid: string = db.CURRENT_UID): Promise<Servidor[]> =>
    responder(() => {
      const ids = listaMiembros.filter((m) => m.uid === uid).map((m) => m.servidorId)
      return listaServidores.filter((s) => ids.includes(s.servidorId))
    }),
  getById: (id: string) => simular(listaServidores.find((s) => s.servidorId === id) ?? null),
  find: (id: string): Servidor | undefined => listaServidores.find((s) => s.servidorId === id),
  list: (): Servidor[] => listaServidores,
  defaultId: (uid: string = db.CURRENT_UID): string => listaMiembros.find((m) => m.uid === uid)?.servidorId ?? '',
  /** Canales, personas en llamada y última actividad de un servidor. */
  summary: (id: string): ResumenServidor => {
    const resumen = db.resumenServidores[id]
    return {
      canales: listaCanales.filter((c) => c.servidorId === id).length,
      enLlamada: resumen?.enLlamada ?? 0,
      actividad: resumen?.actividad ?? 'Sin actividad todavía',
    }
  },
  /** Crea el servidor con sus canales iniciales, la membresia del dueño y una invitacion. */
  create: (datos: DatosServidor, uid: string = db.CURRENT_UID): Promise<{ servidor: Servidor; invitacion: Invitacion }> =>
    responder(() => {
      revisarServidor(datos, uid)
      const nombre = datos.nombre.trim()
      const servidorId = `${crearSlug(nombre) || 'servidor'}-${Date.now().toString(36)}`

      const servidor: Servidor = {
        servidorId,
        nombre,
        descripcion: datos.descripcion.trim(),
        iniciales: crearIniciales(nombre),
        color: COLORES_SERVIDOR[listaServidores.length % COLORES_SERVIDOR.length],
        propietarioUid: uid,
        privacidad: datos.privacidad,
        totalMiembros: 1,
      }
      const miembro: Miembro = {
        miembroId: `m-${Date.now().toString(36)}`,
        servidorId,
        uid,
        rol: 'propietario',
        unidoEn: new Date().toISOString().slice(0, 10),
      }
      const invitacion: Invitacion = {
        codigo: crearCodigo(nombre),
        servidorId,
        invitaUid: uid,
        expiraEn: '7 días',
        enLinea: 1,
        enLlamada: 0,
      }
      const canalesIniciales: Canal[] = [
        { canalId: `${servidorId}-general`, servidorId, nombre: 'general', tipo: 'texto', descripcion: 'Conversación general del servidor' },
        { canalId: `${servidorId}-voz`, servidorId, nombre: 'Sala de voz', tipo: 'voz' },
      ]

      listaServidores = [...listaServidores, servidor]
      listaMiembros = [...listaMiembros, miembro]
      listaInvitaciones = [...listaInvitaciones, invitacion]
      listaCanales = [...listaCanales, ...canalesIniciales]
      guardarLista(CLAVE_SERVIDORES, listaServidores)
      guardarLista(CLAVE_MIEMBROS, listaMiembros)
      guardarLista(CLAVE_INVITACIONES, listaInvitaciones)
      guardarCanales()

      return { servidor, invitacion }
    }),
}

/* ---------- Invitaciones ---------- */

// acepta el enlace completo (talkwith.app/i/codigo) o solo el codigo
const leerCodigo = (texto: string) => texto.trim().split('/').pop()?.toLowerCase() ?? ''

export const inviteService = {
  validate: (texto: string): Promise<Invitacion | null> => {
    const codigo = leerCodigo(texto)
    return simular(listaInvitaciones.find((i) => i.codigo.toLowerCase() === codigo) ?? null)
  },
  /** Invitacion vigente de un servidor, para volver a compartirla. */
  getByServer: (servidorId: string): Promise<Invitacion | null> =>
    simular(listaInvitaciones.find((i) => i.servidorId === servidorId) ?? null),
  /** Agrega al usuario como miembro del servidor de la invitacion. */
  join: (texto: string, uid: string = db.CURRENT_UID): Promise<Servidor> =>
    responder(() => {
      const codigo = leerCodigo(texto)
      const invitacion = listaInvitaciones.find((i) => i.codigo.toLowerCase() === codigo)
      const servidor = invitacion && listaServidores.find((s) => s.servidorId === invitacion.servidorId)
      if (!invitacion || !servidor) throw new ApiError(404, 'El enlace no es válido o ya expiró. Pide uno nuevo a quien te invitó.')

      const yaEsMiembro = listaMiembros.some((m) => m.servidorId === servidor.servidorId && m.uid === uid)
      if (yaEsMiembro) throw new ApiError(409, `Ya eres miembro de ${servidor.nombre}.`)

      const miembro: Miembro = {
        miembroId: `m-${Date.now().toString(36)}`,
        servidorId: servidor.servidorId,
        uid,
        rol: 'miembro',
        unidoEn: new Date().toISOString().slice(0, 10),
      }
      const actualizado = { ...servidor, totalMiembros: servidor.totalMiembros + 1 }
      listaMiembros = [...listaMiembros, miembro]
      listaServidores = listaServidores.map((s) => (s.servidorId === servidor.servidorId ? actualizado : s))
      guardarLista(CLAVE_MIEMBROS, listaMiembros)
      guardarLista(CLAVE_SERVIDORES, listaServidores)
      return actualizado
    }),
}

/* ---------- Miembros y roles ---------- */
export const memberService = {
  getByServer: (servidorId: string): Promise<Miembro[]> => simular(listaMiembros.filter((m) => m.servidorId === servidorId)),
  /** Rol del usuario actual en un servidor, o null si no es miembro. */
  roleOf: (servidorId: string, uid: string = db.CURRENT_UID) =>
    listaMiembros.find((m) => m.servidorId === servidorId && m.uid === uid)?.rol ?? null,
  isMember: (servidorId: string, uid: string = db.CURRENT_UID) => listaMiembros.some((m) => m.servidorId === servidorId && m.uid === uid),
}

/* ---------- Canales ---------- */

// los canales se guardan en localStorage para que el crud se conserve al recargar
const CLAVE_CANALES = 'talkwith-canales-v2'

let listaCanales = cargarLista(CLAVE_CANALES, db.canales)

function guardarCanales() {
  guardarLista(CLAVE_CANALES, listaCanales)
}

// simula la respuesta del servidor, si la accion lanza error la promesa falla
function responder<T>(accion: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(structuredClone(accion()))
      } catch (error) {
        reject(error)
      }
    }, LATENCIA_MS)
  })
}

// revisa los datos igual que lo haria el backend
function revisarCanal(servidorId: string, datos: DatosCanal, canalId?: string) {
  const errores = validarCanal(datos)
  if (errores.nombre) throw new ApiError(400, errores.nombre, 'nombre')
  if (errores.descripcion) throw new ApiError(400, errores.descripcion, 'descripcion')

  const nombre = datos.nombre.trim().toLowerCase()
  const repetido = listaCanales.some((c) => c.servidorId === servidorId && c.canalId !== canalId && c.nombre.toLowerCase() === nombre)
  if (repetido) throw new ApiError(409, 'Ya existe un canal con ese nombre en este servidor.', 'nombre')
}

// "Sala de estudio" -> "sala-de-estudio"
function crearId(nombre: string) {
  const base = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'canal'}-${Date.now().toString(36)}`
}

export const channelService = {
  getByServer: (servidorId: string): Promise<Canal[]> => responder(() => listaCanales.filter((c) => c.servidorId === servidorId)),
  getById: (canalId: string): Promise<Canal> =>
    responder(() => {
      const canal = listaCanales.find((c) => c.canalId === canalId)
      if (!canal) throw new ApiError(404, 'El canal no existe o fue eliminado.')
      return canal
    }),
  create: (servidorId: string, datos: DatosCanal): Promise<Canal> =>
    responder(() => {
      revisarCanal(servidorId, datos)
      const nuevo: Canal = {
        canalId: crearId(datos.nombre),
        servidorId,
        nombre: datos.nombre.trim(),
        tipo: datos.tipo,
        descripcion: datos.descripcion.trim() || undefined,
        privado: datos.privado,
      }
      listaCanales = [...listaCanales, nuevo]
      guardarCanales()
      return nuevo
    }),
  update: (canalId: string, datos: DatosCanal): Promise<Canal> =>
    responder(() => {
      const actual = listaCanales.find((c) => c.canalId === canalId)
      if (!actual) throw new ApiError(404, 'El canal no existe o fue eliminado.')
      revisarCanal(actual.servidorId, datos, canalId)
      const editado: Canal = {
        ...actual,
        nombre: datos.nombre.trim(),
        tipo: datos.tipo,
        descripcion: datos.descripcion.trim() || undefined,
        privado: datos.privado,
      }
      listaCanales = listaCanales.map((c) => (c.canalId === canalId ? editado : c))
      guardarCanales()
      return editado
    }),
  remove: (canalId: string): Promise<void> =>
    responder(() => {
      if (!listaCanales.some((c) => c.canalId === canalId)) throw new ApiError(404, 'El canal ya había sido eliminado.')
      listaCanales = listaCanales.filter((c) => c.canalId !== canalId)
      guardarCanales()
    }),
  listByServer: (servidorId: string): Canal[] => listaCanales.filter((c) => c.servidorId === servidorId),
  find: (canalId: string): Canal | undefined => listaCanales.find((c) => c.canalId === canalId),
  inCall: (canalId: string): string[] => db.enLlamada[canalId] ?? [],
  isMuted: (uid: string): boolean => db.silenciados.includes(uid),
  /** Menciones al usuario en un canal, contadas a partir de los mensajes. */
  mentions: (canalId: string, uid: string = db.CURRENT_UID): number =>
    db.mensajes.filter((m) => m.canalId === canalId && m.menciones?.includes(uid)).length,
  readIds: (): string[] => db.canalesLeidos,
  /** Personas escribiendo ahora mismo en un canal de texto. */
  typing: (canalId: string): string[] => db.escribiendo[canalId] ?? [],
}

/* ---------- Mensajes ---------- */
export const messageService = {
  getByChannel: (canalId: string): Promise<Mensaje[]> => simular(db.mensajes.filter((m) => m.canalId === canalId)),
}

/* ---------- Sesiones de voz y transcripciones ---------- */
export const sessionService = {
  getByServer: (servidorId: string): Promise<SesionVoz[]> => simular(db.sesiones.filter((s) => s.servidorId === servidorId)),
  getById: (sesionId: string) => simular(db.sesiones.find((s) => s.sesionId === sesionId) ?? null),
  getSegments: (sesionId: string) => simular(db.segmentos.filter((g) => g.sesionId === sesionId)),
  getConsents: (sesionId: string) => simular(db.consentimientos.filter((c) => c.sesionId === sesionId)),
  speakingTime: (sesionId: string): Record<string, string> => db.tiempoHablado[sesionId] ?? {},
  /** Total de sesiones del servidor (para la paginación del historial). */
  total: (servidorId: string): number => db.totalSesiones[servidorId] ?? db.sesiones.filter((s) => s.servidorId === servidorId).length,
}

/* ---------- Grabaciones ---------- */
export const recordingService = {
  getByServer: (servidorId: string): Promise<Grabacion[]> => simular(db.grabaciones.filter((g) => g.servidorId === servidorId)),
  getBySession: (sesionId: string) => simular(db.grabaciones.find((g) => g.sesionId === sesionId) ?? null),
  /** No borra nada: la entrega pide solo mostrar la confirmación. */
  remove: (_grabacionId: string) => simular(true),
}

/* ---------- Inicio y búsqueda ---------- */
export const activityService = {
  getRecent: () => simular(db.actividad),
}

/** Quita acentos y pasa a minúsculas conservando la longitud del texto. */
export const normalizar = (s: string) => Array.from(s, (ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).join('')

/** Palabras con significado de una consulta ("permisos del micrófono" → permisos, microfono). */
export const terminos = (q: string) =>
  normalizar(q)
    .split(/\s+/)
    .filter((w) => w.length > 3)

export const searchService = {
  /** Búsqueda simulada sobre mensajes y transcripciones, ordenada por relevancia. */
  search: (q: string) => {
    const palabras = terminos(q)
    if (!palabras.length) return simular([] as typeof db.resultadosBusqueda)
    const puntuados = db.resultadosBusqueda
      .map((r) => {
        const texto = normalizar(r.fragmento)
        return { r, puntos: palabras.filter((w) => texto.includes(w)).length }
      })
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos)
    return simular(puntuados.map((x) => x.r))
  },
}

/* ---------- Resumen de Inicio ---------- */
export const dashboardService = {
  getResumen: (uid: string = db.CURRENT_UID): Promise<ResumenInicio> => {
    const ids = db.miembros.filter((m) => m.uid === uid).map((m) => m.servidorId)
    const canal = db.canales.find(
      (c) => c.tipo === 'voz' && ids.includes(c.servidorId) && (db.enLlamada[c.canalId]?.length ?? 0) > 0,
    )
    let llamada: ResumenInicio['llamada'] = null
    if (canal) {
      const segs = db.segmentos.filter((g) => g.sesionId === db.sesionEnVivo[canal.canalId])
      const ultimo = segs[segs.length - 1]
      llamada = {
        servidorId: canal.servidorId,
        canalId: canal.canalId,
        canalNombre: canal.nombre,
        participantes: db.enLlamada[canal.canalId],
        subtitulo: ultimo ? { hablanteUid: ultimo.hablanteUid, texto: ultimo.texto } : undefined,
      }
    }
    const sesionesNuevas = db.sesiones.filter((s) => ids.includes(s.servidorId) && /^(Hoy|Ayer)/.test(s.inicio)).length
    return simular({ llamada, sesionesNuevas, servidorId: llamada?.servidorId ?? ids[0] ?? '' })
  },
}
