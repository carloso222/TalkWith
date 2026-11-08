import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/authService', () => ({ cerrarSesion: vi.fn() }))

import { useAuthStore } from '../store/authStore'
import type { Usuario } from '../types'
import GuestRoute from './GuestRoute'

const ana: Usuario = { uid: 'u1', nombre: 'Ana', usuario: 'ana', correo: 'a@b.c', iniciales: 'A', color: 'x', estado: 'en-linea' }

function abrir(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<p>pantalla login</p>} />
          <Route path="/registro" element={<p>pantalla registro</p>} />
        </Route>
        <Route path="/app" element={<p>pantalla app</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const poner = (estado: 'cargando' | 'anonimo' | 'autenticado', perfilCompleto: boolean) =>
  useAuthStore.setState({ estado, usuario: estado === 'autenticado' ? ana : null, perfilCompleto })

describe('GuestRoute: /registro solo con perfil incompleto', () => {
  beforeEach(() => poner('anonimo', false))

  it('autenticado con perfil incompleto puede ver /registro', () => {
    poner('autenticado', false)
    abrir('/registro')
    expect(screen.getByText('pantalla registro')).toBeInTheDocument()
  })

  it('autenticado con perfil completo en /registro va a /app', () => {
    poner('autenticado', true)
    abrir('/registro')
    expect(screen.getByText('pantalla app')).toBeInTheDocument()
  })

  it('autenticado con perfil incompleto en /login va a /registro', () => {
    poner('autenticado', false)
    abrir('/login')
    expect(screen.getByText('pantalla registro')).toBeInTheDocument()
  })

  it('cargando en /registro muestra la pantalla de carga sin redirigir', () => {
    poner('cargando', false)
    abrir('/registro')
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })
})
