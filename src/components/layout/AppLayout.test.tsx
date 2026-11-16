import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

// solo importa que columna se dibuja; las demas piezas se reemplazan
vi.mock('./ServerBar', () => ({ default: () => null }))
vi.mock('./DemoPanel', () => ({ default: () => null }))
vi.mock('./TopBar', () => ({ default: ({ seccion }: { seccion: string }) => <p>barra: {seccion}</p> }))
vi.mock('./UserPanel', () => ({ default: () => null }))
vi.mock('./ChannelSidebar', () => ({ default: ({ serverId }: { serverId: string }) => <p>canales de {serverId}</p> }))

import AppLayout from './AppLayout'

function montar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={null} />
          <Route path="buscar" element={null} />
          <Route path="s/:serverId/sesiones" element={null} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout: columna lateral', () => {
  it('en Inicio muestra la navegación general, no los canales de un servidor', () => {
    montar('/app')
    expect(screen.queryByText(/canales de/)).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
    expect(screen.getByText('barra: Inicio')).toBeInTheDocument()
  })

  it('en otras páginas fuera de un servidor tampoco usa el primero', () => {
    montar('/app/buscar')
    expect(screen.queryByText(/canales de/)).toBeNull()
  })

  it('dentro de un servidor muestra sus canales', () => {
    montar('/app/s/B/sesiones')
    expect(screen.getByText('canales de B')).toBeInTheDocument()
  })
})
