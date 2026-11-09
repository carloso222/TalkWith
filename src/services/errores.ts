import { useUiStore } from '../store/uiStore'

/** Texto que ve la persona cuando su sesión ya no sirve (lo muestra el login). */
export const MENSAJE_SESION_EXPIRADA = 'Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión.'

// error que regresa la api, campo indica que input fallo
export class ApiError extends Error {
  status: number
  campo?: string

  constructor(status: number, mensaje: string, campo?: string) {
    super(mensaje)
    this.status = status
    this.campo = campo
  }
}

/** true si el error es un 401: no hay sesión o el token ya no es válido. */
export function esSesionInvalida(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

// qué hacer con un 401; lo registra lib/sesion.ts (cerrar la sesión y mandar al login)
let alPerderSesion: (() => void) | null = null

/** Registra qué hacer cuando llega un 401. Regresa una función para quitarlo. */
export function registrarSesionPerdida(fn: () => void): () => void {
  alPerderSesion = fn
  return () => {
    if (alPerderSesion === fn) alPerderSesion = null
  }
}

// convierte cualquier error en un texto para mostrar
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'No pudimos conectar con el servidor. Revisa tu conexión.'
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

/**
 * Lugar único donde se manejan los errores de la api:
 * - 401 (sesión inválida): cierra la sesión; el login muestra el mensaje, así que aquí no hay toast.
 * - 403 y los demás: toast con el texto del error.
 */
export function manejarError(error: unknown, titulo = 'Algo salió mal') {
  console.error(error)
  if (esSesionInvalida(error)) {
    alPerderSesion?.()
    return
  }
  useUiStore.getState().notify('error', titulo, mensajeDeError(error))
}
