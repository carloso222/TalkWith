import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const perfil = vi.hoisted(() => ({ completarRegistro: vi.fn() }))

vi.mock('../../services/authService', () => ({ cerrarSesion: vi.fn() }))
vi.mock('../../services/perfilService', () => perfil)

import { ApiError } from '../../services/errores'
import { useAuthStore } from '../../store/authStore'
import Registro from './Registro'

describe('Registro', () => {
  beforeEach(() => {
    perfil.completarRegistro.mockReset()
    useAuthStore.setState({
      estado: 'autenticado',
      perfilCompleto: false,
      usuario: { uid: 'u9', nombre: 'Ana Pérez', usuario: '', correo: 'ana@gmail.com', iniciales: 'AP', color: 'x', estado: 'en-linea' },
    })
  })

  it('muestra el error en el campo usuario cuando el nombre ya está tomado', async () => {
    perfil.completarRegistro.mockRejectedValue(new ApiError(409, 'Ese nombre de usuario ya está en uso.', 'usuario'))
    render(<MemoryRouter><Registro /></MemoryRouter>)

    await userEvent.clear(screen.getByLabelText('Nombre de usuario'))
    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'ana.perez')
    await userEvent.click(screen.getByRole('checkbox', { name: /términos de uso/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /transcribirse/i }))
    await userEvent.click(screen.getByRole('button', { name: /crear mi cuenta/i }))

    expect(await screen.findByText('Ese nombre de usuario ya está en uso.')).toBeInTheDocument()
    expect(perfil.completarRegistro).toHaveBeenCalledTimes(1)
  })
})
