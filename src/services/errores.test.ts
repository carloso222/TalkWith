import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../store/uiStore'
import { ApiError, esSesionInvalida, manejarError, MENSAJE_SESION_EXPIRADA, registrarSesionPerdida } from './errores'
import { aApiError } from './firestore/errores'

describe('manejo central de errores', () => {
  const notify = vi.fn()
  let quitar: () => void = () => {}

  beforeEach(() => {
    notify.mockReset()
    useUiStore.setState({ notify })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    quitar()
    vi.restoreAllMocks()
  })

  it('un 401 llama al manejador de sesión perdida y no muestra toast', () => {
    const alPerder = vi.fn()
    quitar = registrarSesionPerdida(alPerder)
    manejarError(new ApiError(401, MENSAJE_SESION_EXPIRADA))
    expect(alPerder).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()
  })

  it('un 403 muestra el toast y no toca la sesión', () => {
    const alPerder = vi.fn()
    quitar = registrarSesionPerdida(alPerder)
    manejarError(new ApiError(403, 'No tienes permiso para hacer esto.'), 'No se pudo guardar')
    expect(alPerder).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('error', 'No se pudo guardar', 'No tienes permiso para hacer esto.')
  })

  it('al quitar el manejador, un 401 ya no lo llama', () => {
    const alPerder = vi.fn()
    registrarSesionPerdida(alPerder)()
    manejarError(new ApiError(401, MENSAJE_SESION_EXPIRADA))
    expect(alPerder).not.toHaveBeenCalled()
  })

  it('esSesionInvalida solo reconoce el 401', () => {
    expect(esSesionInvalida(new ApiError(401, 'x'))).toBe(true)
    expect(esSesionInvalida(new ApiError(403, 'x'))).toBe(false)
    expect(esSesionInvalida(new Error('x'))).toBe(false)
  })
})

describe('aApiError (Firestore)', () => {
  it('unauthenticated se vuelve un 401 con el mensaje de sesión expirada', () => {
    const e = aApiError({ code: 'unauthenticated' })
    expect(e).toBeInstanceOf(ApiError)
    expect(e).toMatchObject({ status: 401, message: MENSAJE_SESION_EXPIRADA })
  })

  it('permission-denied sigue siendo un 403', () => {
    expect(aApiError({ code: 'permission-denied' })).toMatchObject({ status: 403 })
  })
})
