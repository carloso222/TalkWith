import { useUiStore } from '../store/uiStore'

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

// convierte cualquier error en un texto para mostrar
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'No pudimos conectar con el servidor. Revisa tu conexión.'
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// lugar unico donde se muestran los errores de la api
export function manejarError(error: unknown, titulo = 'Algo salió mal') {
  console.error(error)
  useUiStore.getState().notify('error', titulo, mensajeDeError(error))
}
