import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const srv = vi.hoisted(() => ({
  oyente: null as null | ((u: User | null) => Promise<void> | void),
  cerrarSesion: vi.fn(async () => {}),
  asegurarPerfil: vi.fn(),
}))

vi.mock('../services/authService', () => ({
  cerrarSesion: srv.cerrarSesion,
  escucharSesion: (cb: (u: User | null) => Promise<void> | void) => {
    srv.oyente = cb
    return () => {}
  },
}))
vi.mock('../services/perfilService', () => ({ asegurarPerfil: srv.asegurarPerfil }))

import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { useVoiceStore } from '../store/voiceStore'
import type { Usuario } from '../types'
import { iniciarEscuchaSesion } from './sesion'

const ana: Usuario = { uid: 'u1', nombre: 'Ana', usuario: 'ana', correo: 'a@b.c', iniciales: 'A', color: 'x', estado: 'en-linea' }

describe('iniciarEscuchaSesion', () => {
  beforeEach(() => {
    srv.cerrarSesion.mockClear()
    srv.asegurarPerfil.mockReset()
    iniciarEscuchaSesion()
  })

  it('con un usuario de Firebase llena el store', async () => {
    srv.asegurarPerfil.mockResolvedValue({ usuario: ana, perfilCompleto: true })
    await srv.oyente!({ uid: 'u1' } as User)
    expect(useAuthStore.getState()).toMatchObject({ estado: 'autenticado', usuario: ana, perfilCompleto: true })
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
