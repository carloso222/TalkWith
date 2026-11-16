import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SesionVoz } from '../../types'

// cada servidor tiene su propio canal de voz y una sesion en el
const sesion = (sid: string): SesionVoz => ({
  sesionId: `${sid}-ses`, servidorId: sid, canalId: `${sid}-voz`, inicio: 'Hoy', duracion: '00:01:00', participantes: [], totalSegmentos: 2, grabacion: 'sin-grabacion',
})

vi.mock('../../services', () => ({
  sessionService: { getByServer: vi.fn(async (sid: string) => [sesion(sid)]) },
  channelService: {
    listByServer: (sid: string) => [{ canalId: `${sid}-voz`, servidorId: sid, nombre: `Voz ${sid}`, tipo: 'voz' }],
    find: (id: string) => ({ canalId: id, nombre: `Voz ${id.replace('-voz', '')}` }),
  },
  serverService: { find: (sid: string) => ({ servidorId: sid, nombre: `Servidor ${sid}` }) },
  userService: { find: () => undefined },
  normalizar: (s: string) => s.toLowerCase(),
}))

import Sesiones from './Sesiones'

// boton de prueba para cambiar de servidor sin salir de la pagina
function IrA({ sid }: { sid: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(`/app/s/${sid}/sesiones`)}>Ir a {sid}</button>
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/app/s/A/sesiones']}>
      <IrA sid="B" />
      <Routes>
        <Route path="/app/s/:serverId/sesiones" element={<Sesiones />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Historial de sesiones', () => {
  it('muestra las sesiones del servidor abierto', async () => {
    montar()
    expect(await screen.findByText('Voz A')).toBeInTheDocument()
  })

  it('al cambiar de servidor no arrastra el filtro de canal del anterior', async () => {
    const usuario = userEvent.setup()
    montar()
    await screen.findByText('Voz A')

    // filtra por el canal de voz del servidor A
    await usuario.click(screen.getByRole('button', { name: /Canal:/ }))
    await usuario.click(screen.getByRole('option', { name: 'Voz A' }))
    expect(screen.getByText('1 sesiones coinciden con los filtros')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Ir a B' }))
    expect(await screen.findByText('Voz B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Canal:/ })).toHaveTextContent('Canal: Todos')
  })
})
