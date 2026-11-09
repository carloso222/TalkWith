import { io, type Socket } from 'socket.io-client'
import { obtenerTokenSocket } from './firebase'

// servidor de socket.io (TW 05)
const URL_SERVIDOR = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

let socket: Socket | null = null

/** Regresa el socket de la app y lo conecta si hace falta. */
export function obtenerSocket(): Socket {
  if (!socket) {
    socket = io(URL_SERVIDOR, {
      autoConnect: false,
      // el token se pide en cada conexion, asi al reconectar se manda uno vigente
      auth: (cb) => {
        obtenerTokenSocket().then(
          (token) => cb({ token }),
          () => cb({}),
        )
      },
    })
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
