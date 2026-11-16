import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Invitacion } from '../../types'

const inv = (codigo: string, expiraEn = '7 días'): Invitacion => ({ codigo, servidorId: 'A', invitaUid: 'yo', expiraEn, enLinea: 0, enLlamada: 0 })
const getByServer = vi.fn()
const create = vi.fn()

vi.mock('../../services', () => ({
  inviteService: { getByServer: (...a: unknown[]) => getByServer(...a), create: (...a: unknown[]) => create(...a) },
  serverService: { find: () => ({ servidorId: 'A', nombre: 'Club' }) },
  enlaceInvitacion: (c: string) => `https://app.test/i/${c}`,
  mensajeDeError: (e: Error) => e.message,
}))
const notify = vi.fn()
vi.mock('../../store/uiStore', () => ({ useUiStore: (sel: (s: { notify: typeof notify }) => unknown) => sel({ notify }) }))

import InvitarModal from './InvitarModal'

const montar = () => render(<InvitarModal servidorId="A" open onClose={() => {}} />)
const campo = () => screen.getByLabelText('Enlace de invitación')

describe('InvitarModal', () => {
  beforeEach(() => {
    getByServer.mockReset()
    create.mockReset()
    notify.mockReset()
  })

  it('reusa la invitación de esta sesión si sigue vigente', async () => {
    getByServer.mockResolvedValue(inv('club-guardada0000', '3 días'))
    montar()
    await waitFor(() => expect(campo()).toHaveValue('https://app.test/i/club-guardada0000'))
    expect(screen.getByText('Vence en 3 días.')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('si no hay una, crea una nueva al abrir', async () => {
    getByServer.mockResolvedValue(null)
    create.mockResolvedValue(inv('club-nueva000000'))
    montar()
    await waitFor(() => expect(campo()).toHaveValue('https://app.test/i/club-nueva000000'))
    expect(create).toHaveBeenCalledWith('A')
  })

  it('"Generar enlace nuevo" cambia el enlace', async () => {
    getByServer.mockResolvedValue(inv('club-guardada0000'))
    create.mockResolvedValue(inv('club-otra00000000'))
    montar()
    await waitFor(() => expect(campo()).toHaveValue('https://app.test/i/club-guardada0000'))
    await userEvent.click(screen.getByRole('button', { name: /Generar enlace nuevo/ }))
    await waitFor(() => expect(campo()).toHaveValue('https://app.test/i/club-otra00000000'))
  })

  it('copiar pone el enlace en el portapapeles', async () => {
    const usuario = userEvent.setup()
    getByServer.mockResolvedValue(inv('club-guardada0000'))
    montar()
    await waitFor(() => expect(campo()).toHaveValue('https://app.test/i/club-guardada0000'))
    await usuario.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(await navigator.clipboard.readText()).toBe('https://app.test/i/club-guardada0000')
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument()
  })

  it('si no tiene permiso muestra el error', async () => {
    getByServer.mockResolvedValue(null)
    create.mockRejectedValue(new Error('Solo propietarios y admins pueden invitar personas.'))
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo propietarios y admins')
  })
})
