import { io, type Socket } from 'socket.io-client'
import { ApiError, manejarError, MENSAJE_SESION_EXPIRADA } from '../services/errores'
import { obtenerTokenSocket, renovarToken } from './firebase'

// servidor de socket.io (TW 05)
const URL_SERVIDOR = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

let socket: Socket | null = null
// ya se reintentó con un token recién renovado (se reinicia al conectar)
let reintentoConTokenNuevo = false

/**
 * El servidor rechazó el token. Antes de tratarlo como 401 se le pregunta a Firebase:
 * - si Firebase no puede renovar el token, la sesión ya no sirve → 401 al manejo central;
 * - si lo renueva, se reintenta una vez con el token nuevo. Si vuelve a fallar es un
 *   problema del servidor y no se cierra la sesión (los hooks muestran el error).
 */
async function alRechazarToken(s: Socket): Promise<void> {
  if (reintentoConTokenNuevo) return
  reintentoConTokenNuevo = true
  try {
    await renovarToken()
  } catch (e) {
    // sin internet no se sabe si la sesión sirve; no la cerramos
    if ((e as { code?: string } | null)?.code === 'auth/network-request-failed') return
    manejarError(new ApiError(401, MENSAJE_SESION_EXPIRADA))
    return
  }
  if (s === socket && !s.active) s.connect()
}

/** Regresa el socket de la app y lo conecta si hace falta. */
export function obtenerSocket(): Socket {
  if (!socket) {
    const nuevo = io(URL_SERVIDOR, {
      autoConnect: false,
      // el token se pide en cada conexion, asi al reconectar se manda uno vigente
      auth: (cb) => {
        obtenerTokenSocket().then(
          (token) => cb({ token }),
          () => cb({}),
        )
      },
    })
    reintentoConTokenNuevo = false
    nuevo.on('connect', () => {
      reintentoConTokenNuevo = false
    })
    nuevo.on('connect_error', (err: Error) => {
      if (err.message === 'token-invalido') void alRechazarToken(nuevo)
    })
    socket = nuevo
  }
  // active = ya esta conectado o reintentando solo
  if (!socket.active) socket.connect()
  return socket
}

/** Se llama al cerrar sesion. */
export function desconectarSocket(): void {
  socket?.disconnect()
  socket = null
}

/** Texto para los errores que manda el servidor. */
export function mensajeErrorSocket(codigo?: string): string {
  if (codigo === 'sin-permiso') return 'No tienes acceso a este canal de voz.'
  if (codigo === 'sin-token' || codigo === 'token-invalido') return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (codigo === 'error-servidor') return 'El servidor de voz tuvo un problema. Intenta de nuevo.'
  return 'No pudimos conectar con el servidor de voz.'
}
