import { ApiError, MENSAJE_SESION_EXPIRADA } from '../errores'

/**
 * Traduce un error de Firestore a un `ApiError` con texto para el usuario.
 * Uso: `try { ... } catch (e) { throw aApiError(e) }`. Los demás errores pasan sin cambios.
 */
export function aApiError(e: unknown): unknown {
  const codigo = (e as { code?: string } | null)?.code
  if (codigo === 'unauthenticated') return new ApiError(401, MENSAJE_SESION_EXPIRADA)
  if (codigo === 'permission-denied') return new ApiError(403, 'No tienes permiso para hacer esto.')
  if (codigo === 'not-found') return new ApiError(404, 'Lo que buscas ya no existe.')
  if (codigo === 'unavailable') return new ApiError(503, 'Sin conexión. Revisa tu internet e inténtalo de nuevo.')
  return e
}
