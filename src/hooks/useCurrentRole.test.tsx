import { renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/authService', () => ({ cerrarSesion: vi.fn() }))
vi.mock('../services', () => ({ memberService: { roleOf: () => 'miembro' } }))

import { useAuthStore } from '../store/authStore'
import { useCurrentRole } from './useCurrentRole'

const envoltura = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/app/s/x']}>
    <Routes>
      <Route path="/app/s/:serverId" element={children} />
    </Routes>
  </MemoryRouter>
)

describe('useCurrentRole', () => {
  beforeEach(() => {
    useAuthStore.setState({
      estado: 'autenticado',
      rolDemo: 'propietario',
      usuario: { uid: 'u1', nombre: 'Ana', usuario: 'ana', correo: 'a@b.c', iniciales: 'A', color: 'x', estado: 'en-linea' },
    })
  })
  afterEach(() => vi.unstubAllEnvs())

  it('en desarrollo respeta rolDemo', () => {
    vi.stubEnv('DEV', true)
    const { result } = renderHook(() => useCurrentRole(), { wrapper: envoltura })
    expect(result.current).toBe('propietario')
  })

  it('fuera de desarrollo ignora rolDemo y usa el rol real', () => {
    vi.stubEnv('DEV', false)
    const { result } = renderHook(() => useCurrentRole(), { wrapper: envoltura })
    expect(result.current).toBe('miembro')
  })
})
