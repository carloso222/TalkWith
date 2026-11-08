import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, type To } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/authService', () => ({ cerrarSesion: vi.fn() }))

import { useAuthStore } from '../store/authStore'
import type { Usuario } from '../types'
import GuestRoute from './GuestRoute'
import ProtectedRoute from './ProtectedRoute'

const ana: Usuario = { uid: 'u1', nombre: 'Ana', usuario: 'ana', correo: 'a@b.c', iniciales: 'A', color: 'x', estado: 'en-linea' }

function abrir(inicial: To) {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<p>pantalla login</p>} />
          <Route path="/registro" element={<p>pantalla registro</p>} />
        </Route>
        <Route path="/app" element={<ProtectedRoute />}>
          <Route index element={<p>pantalla app</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const poner = (estado: 'cargando' | 'anonimo' | 'autenticado', perfilCompleto = true) =>
  useAuthStore.setState({ estado, usuario: estado === 'autenticado' ? ana : null, perfilCompleto })

describe('guardias de sesión', () => {
  beforeEach(() => poner('cargando', false))

  it('cargando: muestra la pantalla de carga y no redirige', () => {
    abrir('/app')
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    expect(screen.queryByText('pantalla login')).toBeNull()
  })

  it('anónimo en /app va a /login', () => {
    poner('anonimo', false)
    abrir('/app')
    expect(screen.getByText('pantalla login')).toBeInTheDocument()
  })

  it('autenticado con perfil incompleto va a /registro', () => {
    poner('autenticado', false)
    abrir('/app')
    expect(screen.getByText('pantalla registro')).toBeInTheDocument()
  })

  it('autenticado y completo entra a /app', () => {
    poner('autenticado')
    abrir('/app')
    expect(screen.getByText('pantalla app')).toBeInTheDocument()
  })

  it('autenticado y completo en /login va a /app', () => {
    poner('autenticado')
    abrir('/login')
    expect(screen.getByText('pantalla app')).toBeInTheDocument()
  })

  it('autenticado y completo en /login regresa a "from"', () => {
    poner('autenticado')
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/app' } }]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<p>pantalla login</p>} />
          </Route>
          <Route path="/app" element={<p>destino from</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('destino from')).toBeInTheDocument()
  })

  it('/registro sin sesión va a /login', () => {
    poner('anonimo', false)
    abrir('/registro')
    expect(screen.getByText('pantalla login')).toBeInTheDocument()
  })
})
