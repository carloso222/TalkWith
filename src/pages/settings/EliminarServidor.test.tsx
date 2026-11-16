import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const remove = vi.fn()
let rol: string | null = 'propietario'

vi.mock('../../hooks/useCurrentRole', () => ({ useCurrentRole: () => rol }))
vi.mock('../../services', () => ({
  serverService: { find: () => ({ servidorId: 'A', nombre: 'Alfa' }), remove: (...args: unknown[]) => remove(...args) },
  channelService: { listByServer: () => [{}, {}] },
  sessionService: { getByServer: async () => [] },
  memberService: { getByServer: async () => [{}] },
  mensajeDeError: (e: Error) => e.message,
}))
const notify = vi.fn()
vi.mock('../../store/uiStore', () => ({ useUiStore: (sel: (s: { notify: typeof notify }) => unknown) => sel({ notify }) }))

import EliminarServidor from './EliminarServidor'

function montar() {
  render(
    <MemoryRouter initialEntries={['/app/s/A/ajustes/eliminar']}>
      <Routes>
        <Route path="/app/s/:serverId/ajustes/eliminar" element={<EliminarServidor />} />
        <Route path="/app" element={<p>pantalla de inicio</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Eliminar servidor', () => {
  beforeEach(() => {
    rol = 'propietario'
    remove.mockReset()
    notify.mockReset()
  })

  it('el botón se activa solo con el nombre exacto', async () => {
    montar()
    const boton = screen.getByRole('button', { name: 'Eliminar servidor definitivamente' })
    expect(boton).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/para confirmar/), 'alfa')
    expect(boton).toBeDisabled()
    await userEvent.clear(screen.getByLabelText(/para confirmar/))
    await userEvent.type(screen.getByLabelText(/para confirmar/), 'Alfa')
    expect(boton).toBeEnabled()
  })

  it('al confirmar borra de verdad, lleva a Inicio y avisa', async () => {
    remove.mockResolvedValue(undefined)
    montar()
    await userEvent.type(screen.getByLabelText(/para confirmar/), 'Alfa')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar servidor definitivamente' }))
    expect(remove).toHaveBeenCalledWith('A')
    expect(await screen.findByText('pantalla de inicio')).toBeInTheDocument()
    expect(notify).toHaveBeenCalledWith('exito', 'Alfa se eliminó', expect.any(String))
  })

  it('si Firestore lo rechaza, avisa el error', async () => {
    remove.mockRejectedValue(new Error('Sin permiso'))
    montar()
    await userEvent.type(screen.getByLabelText(/para confirmar/), 'Alfa')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar servidor definitivamente' }))
    await screen.findByText('pantalla de inicio')
    expect(notify).toHaveBeenCalledWith('error', 'No se pudo eliminar Alfa', 'Sin permiso')
  })

  it('un admin ve el aviso y no puede eliminar', () => {
    rol = 'admin'
    montar()
    expect(screen.queryByRole('button', { name: 'Eliminar servidor definitivamente' })).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Solo la persona propietaria')
  })
})
