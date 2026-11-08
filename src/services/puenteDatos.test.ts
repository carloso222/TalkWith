import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))

import { CURRENT_UID, servidores } from '../mocks/data'
import { useAuthStore } from '../store/authStore'
import type { Usuario } from '../types'
import { memberService, serverService } from './index'
import { uidDeDatos } from './sesionDatos'
import { userService } from './userService'

const real: Usuario = { uid: 'google-uid-1', nombre: 'Cuenta Real', usuario: 'real', correo: 'r@gmail.com', iniciales: 'CR', color: 'x', estado: 'en-linea' }

describe('puente de datos de ejemplo (Fase 1)', () => {
  beforeEach(() => useAuthStore.setState({ estado: 'autenticado', usuario: real, perfilCompleto: true }))

  it('uidDeDatos traduce el uid de la sesión y el valor ausente al de los mocks', () => {
    expect(uidDeDatos()).toBe(CURRENT_UID)
    expect(uidDeDatos(real.uid)).toBe(CURRENT_UID)
    expect(uidDeDatos('u-otro')).toBe('u-otro')
  })

  it('una cuenta real es miembro de los servidores de ejemplo (sin 404)', () => {
    const id = servidores[0].servidorId
    expect(memberService.isMember(id, real.uid)).toBe(true)
    expect(memberService.roleOf(id, real.uid)).not.toBeNull()
    expect(serverService.defaultId(real.uid)).not.toBe('')
  })

  it('userService.find regresa el usuario de la sesión para el uid real', () => {
    expect(userService.find(real.uid)).toEqual(real)
    expect(userService.find(CURRENT_UID)?.uid).toBe(CURRENT_UID)
  })
})
