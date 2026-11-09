import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const srv = vi.hoisted(() => ({
  oyente: null as null | ((u: User | null) => Promise<void> | void),
  cerrarSesion: vi.fn(async () => {}),
  asegurarPerfil: vi.fn(),
  iniciarEscuchas: vi.fn(),
  detenerEscuchas: vi.fn(),
}))

vi.mock('../services/authService', () => ({
  cerrarSesion: srv.cerrarSesion,
  escucharSesion: (cb: (u: User | null) => Promise<void> | void) => {
    srv.oyente = cb
    return () => {}
  },
}))
vi.mock('../services/perfilService', () => ({ asegurarPerfil: srv.asegurarPerfil }))
vi.mock('../services/firestore/escuchas', () => ({
  iniciarEscuchas: srv.iniciarEscuchas,
  detenerEscuchas: srv.detenerEscuchas,
}))

import { ApiError, manejarError, MENSAJE_SESION_EXPIRADA } from '../services/errores'
import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import { useUiStore } from '../store/uiStore'
import { useVoiceStore } from '../store/voiceStore'
import type { Usuario } from '../types'
import { iniciarEscuchaSesion } from './sesion'

const ana: Usuario = { uid: 'u1', nombre: 'Ana', usuario: 'ana', correo: 'a@b.c', iniciales: 'A', color: 'x', estado: 'en-linea' }

describe('iniciarEscuchaSesion', () => {
  beforeEach(() => {
    srv.cerrarSesion.mockClear()
    srv.asegurarPerfil.mockReset()
    srv.iniciarEscuchas.mockReset()
    srv.detenerEscuchas.mockReset()
    iniciarEscuchaSesion()
  })

  it('con un usuario de Firebase llena el store', async () => {
    srv.asegurarPerfil.mockResolvedValue({ usuario: ana, perfilCompleto: true })
    await srv.oyente!({ uid: 'u1' } as User)
    expect(useAuthStore.getState()).toMatchObject({ estado: 'autenticado', usuario: ana, perfilCompleto: true })
  })

  it('con un usuario inicia las escuchas de Firestore con su uid antes de marcar la sesión', async () => {
    useAuthStore.getState().limpiar()
    let estadoAlIniciar = ''
    srv.iniciarEscuchas.mockImplementation(() => {
      estadoAlIniciar = useAuthStore.getState().estado
    })
    srv.asegurarPerfil.mockResolvedValue({ usuario: ana, perfilCompleto: true })
    await srv.oyente!({ uid: 'u1' } as User)
    expect(srv.iniciarEscuchas).toHaveBeenCalledWith('u1')
    expect(estadoAlIniciar).toBe('anonimo')
    expect(useAuthStore.getState().estado).toBe('autenticado')
  })

  it('sin usuario detiene las escuchas y vacía la caché de datos', async () => {
    useDatosStore.getState().ponerEstado('listo')
    useDatosStore.getState().marcarPendiente('A')
    await srv.oyente!(null)
    expect(srv.detenerEscuchas).toHaveBeenCalled()
    expect(useDatosStore.getState()).toMatchObject({ estado: 'inactivo', pendientes: {}, servidores: {}, perfiles: {} })
  })

  it('si falla el perfil no inicia las escuchas', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    srv.asegurarPerfil.mockRejectedValue(new Error('sin permiso'))
    await srv.oyente!({ uid: 'u1' } as User)
    expect(srv.iniciarEscuchas).not.toHaveBeenCalled()
  })

  it('al recibir null limpia sesión, rol demo, voz y la clave heredada', async () => {
    useAuthStore.setState({ estado: 'autenticado', usuario: ana, rolDemo: 'admin', perfilCompleto: true })
    useVoiceStore.setState({ subtitlesBlocked: true })
    sessionStorage.setItem('talkwith-auth', '{"state":{}}')

    await srv.oyente!(null)

    expect(useAuthStore.getState()).toMatchObject({ estado: 'anonimo', usuario: null, rolDemo: null })
    expect(useVoiceStore.getState().subtitlesBlocked).toBe(false)
    expect(sessionStorage.getItem('talkwith-auth')).toBeNull()
  })

  it('si falla el perfil avisa y cierra la sesión', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    srv.asegurarPerfil.mockRejectedValue(new Error('sin permiso'))
    await srv.oyente!({ uid: 'u1' } as User)
    expect(srv.cerrarSesion).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().toasts.some((t) => t.tipo === 'error')).toBe(true)
  })

  it('un null que llega con el perfil en vuelo gana sobre el resultado tardío', async () => {
    let resolver!: (v: unknown) => void
    srv.asegurarPerfil.mockReturnValue(new Promise((r) => { resolver = r }))
    const p = srv.oyente!({ uid: 'u1' } as User)
    await srv.oyente!(null)
    resolver({ usuario: ana, perfilCompleto: true })
    await p
    expect(useAuthStore.getState().estado).toBe('anonimo')
  })
})

describe('sesión perdida y 401', () => {
  const entrar = async () => {
    srv.asegurarPerfil.mockResolvedValue({ usuario: ana, perfilCompleto: true })
    await srv.oyente!({ uid: 'u1' } as User)
  }

  beforeEach(() => {
    srv.cerrarSesion.mockClear()
    useAuthStore.getState().limpiar()
    useAuthStore.getState().setAvisoLogin(null)
    iniciarEscuchaSesion()
  })

  it('si la sesión se pierde sin cerrarla, deja el aviso para el login', async () => {
    await entrar()
    await srv.oyente!(null)
    expect(useAuthStore.getState()).toMatchObject({ estado: 'anonimo', avisoLogin: MENSAJE_SESION_EXPIRADA })
  })

  it('al cerrar sesión a propósito no hay aviso', async () => {
    await entrar()
    await useAuthStore.getState().logout()
    await srv.oyente!(null)
    expect(useAuthStore.getState()).toMatchObject({ estado: 'anonimo', avisoLogin: null, cerrandoSesion: false })
  })

  it('al entrar de nuevo se borra el aviso', async () => {
    await entrar()
    await srv.oyente!(null)
    await entrar()
    expect(useAuthStore.getState().avisoLogin).toBeNull()
  })

  it('un 401 en manejarError cierra la sesión', async () => {
    await entrar()
    manejarError(new ApiError(401, MENSAJE_SESION_EXPIRADA))
    expect(srv.cerrarSesion).toHaveBeenCalledTimes(1)
  })

  it('un 401 sin sesión no hace nada', () => {
    manejarError(new ApiError(401, MENSAJE_SESION_EXPIRADA))
    expect(srv.cerrarSesion).not.toHaveBeenCalled()
  })
})
