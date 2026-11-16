import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

// sin socket ni panel de usuario: aqui solo importan los enlaces
vi.mock('../../hooks/useLlamadasServidor', () => ({ useLlamadasServidor: () => ({}) }))
vi.mock('./UserPanel', () => ({ default: () => null }))

import ChannelSidebar from './ChannelSidebar'

function montar(serverId: string, ruta = `/app/s/${serverId}/c/general`) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ChannelSidebar serverId={serverId} />
    </MemoryRouter>,
  )
}

describe('ChannelSidebar: historial de sesiones', () => {
  it('el enlace lleva al historial del servidor abierto, no al primero', () => {
    montar('segundo')
    expect(screen.getByRole('link', { name: 'Historial de sesiones' })).toHaveAttribute('href', '/app/s/segundo/sesiones')
  })

  it('queda marcado dentro del detalle de una sesión', () => {
    montar('A', '/app/s/A/sesiones/ses1')
    expect(screen.getByRole('link', { name: 'Historial de sesiones' })).toHaveAttribute('aria-current', 'page')
  })
})
