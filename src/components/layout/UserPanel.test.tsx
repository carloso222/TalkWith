import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../ui/Avatar', () => ({ default: () => null }))

import { useAuthStore } from '../../store/authStore'
import { useVoiceStore } from '../../store/voiceStore'
import type { Usuario } from '../../types'
import UserPanel from './UserPanel'

const ana: Usuario = { uid: 'ana', nombre: 'Ana', usuario: 'ana', correo: 'ana@demo.test', iniciales: 'A', color: '#fff', estado: 'en-linea' }

function montar() {
  render(
    <MemoryRouter>
      <UserPanel />
    </MemoryRouter>,
  )
}

describe('UserPanel', () => {
  beforeEach(() => {
    useVoiceStore.setState(useVoiceStore.getInitialState(), true)
    useAuthStore.setState({ usuario: ana })
  })

  it('el botón del micrófono silencia y activa en el estado compartido', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Silenciar micrófono' }))
    expect(useVoiceStore.getState().silenciado).toBe(true)
    expect(screen.getByRole('button', { name: 'Activar micrófono' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('los audífonos ensordecen y el micrófono se ve apagado', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Ensordecer' }))
    expect(useVoiceStore.getState().ensordecido).toBe(true)
    expect(screen.getByRole('button', { name: 'Activar audio' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Activar micrófono' })).toBeInTheDocument()
  })
})
