import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socketFalso } from '../test/socketFalso'

const mocks = vi.hoisted(() => ({
  renovarToken: vi.fn(),
  manejarError: vi.fn(),
  connect: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: () => Object.assign(socketFalso, { connect: mocks.connect, disconnect: vi.fn() }),
}))
vi.mock('./firebase', () => ({ obtenerTokenSocket: vi.fn(), renovarToken: mocks.renovarToken }))
vi.mock('../services/errores', async () => {
  const real = await vi.importActual<typeof import('../services/errores')>('../services/errores')
  return { ...real, manejarError: mocks.manejarError }
})

import { desconectarSocket, obtenerSocket } from './socket'

// deja que terminen las promesas pendientes
const esperar = () => new Promise((r) => setTimeout(r, 0))

describe('socket: token rechazado por el servidor', () => {
  beforeEach(() => {
    desconectarSocket()
    socketFalso.reiniciar()
    Object.values(mocks).forEach((m) => m.mockReset())
    obtenerSocket()
    socketFalso.active = false
    mocks.connect.mockClear()
  })

  it('si Firebase no puede renovar el token, manda un 401 al manejo central', async () => {
    mocks.renovarToken.mockRejectedValue({ code: 'auth/user-token-expired' })
    socketFalso.disparar('connect_error', new Error('token-invalido'))
    await esperar()
    expect(mocks.manejarError).toHaveBeenCalledTimes(1)
    expect(mocks.manejarError.mock.calls[0][0]).toMatchObject({ status: 401 })
  })

  it('si Firebase renueva el token, reintenta una sola vez sin cerrar la sesión', async () => {
    mocks.renovarToken.mockResolvedValue(undefined)
    socketFalso.disparar('connect_error', new Error('token-invalido'))
    await esperar()
    expect(mocks.connect).toHaveBeenCalledTimes(1)
    socketFalso.disparar('connect_error', new Error('token-invalido'))
    await esperar()
    expect(mocks.renovarToken).toHaveBeenCalledTimes(1)
    expect(mocks.manejarError).not.toHaveBeenCalled()
  })

  it('sin internet no cierra la sesión', async () => {
    mocks.renovarToken.mockRejectedValue({ code: 'auth/network-request-failed' })
    socketFalso.disparar('connect_error', new Error('token-invalido'))
    await esperar()
    expect(mocks.manejarError).not.toHaveBeenCalled()
  })

  it('otros errores de conexión no tocan la sesión', async () => {
    socketFalso.disparar('connect_error', new Error('xhr poll error'))
    await esperar()
    expect(mocks.renovarToken).not.toHaveBeenCalled()
    expect(mocks.manejarError).not.toHaveBeenCalled()
  })
})
