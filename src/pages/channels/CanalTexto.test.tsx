import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Canal, Mensaje } from '../../types'

// chat falso: mensajes fijos y funciones espiadas
const chat = {
  mensajes: [] as Mensaje[],
  cargando: false,
  errorCarga: '',
  estado: 'conectado',
  error: '',
  enviar: vi.fn(),
  editar: vi.fn(async () => true),
  borrar: vi.fn(async () => true),
  reintentar: vi.fn(),
}
vi.mock('../../hooks/useCanalTexto', () => ({ useCanalTexto: () => chat }))

let rol: string = 'miembro'
vi.mock('../../hooks/useCurrentRole', () => ({ useCurrentRole: () => rol }))
vi.mock('../../hooks/useAutoScroll', () => ({ useAutoScroll: () => ({ current: null }) }))
vi.mock('./ColumnaMiembros', () => ({ default: () => null }))
vi.mock('../../components/ui/Avatar', () => ({ default: () => null }))
vi.mock('../../services', () => ({
  channelService: { typing: () => [] },
  userService: { find: (uid: string) => ({ uid, nombre: uid === 'yo' ? 'Yo Mismo' : 'Ana López' }) },
}))
vi.mock('../../store/authStore', () => ({ useAuthStore: (sel: (s: { usuario: { uid: string } }) => unknown) => sel({ usuario: { uid: 'yo' } }) }))

// el dialogo de confirmacion se acepta solo
const notify = vi.fn()
const confirm = vi.fn(async () => true)
vi.mock('../../store/uiStore', () => ({ useUiStore: (sel: (s: object) => unknown) => sel({ notify, confirm }) }))

import CanalTexto from './CanalTexto'

const canal: Canal = { canalId: 'general', servidorId: 'A', nombre: 'general', tipo: 'texto' } as Canal
const mensaje = (id: string, autorUid: string, contenido: string, extra: Partial<Mensaje> = {}): Mensaje => ({
  mensajeId: id, canalId: 'general', autorUid, contenido, creadoEn: '10:00', creadoMs: Number(id.slice(1)) * 1000, ...extra,
})

function montar() {
  render(
    <MemoryRouter>
      <CanalTexto canal={canal} />
    </MemoryRouter>,
  )
}

// las acciones de cada mensaje viven dentro de su <article>
const fila = (texto: string) => screen.getByText(texto).closest('article') as HTMLElement

describe('CanalTexto: editar y borrar', () => {
  beforeEach(() => {
    rol = 'miembro'
    chat.mensajes = [mensaje('m1', 'ana', 'hola de ana'), mensaje('m2', 'yo', 'mi mensaje')]
    chat.editar.mockClear()
    chat.borrar.mockClear()
    notify.mockClear()
    confirm.mockClear()
  })

  it('en mis mensajes puedo editar y borrar; en los ajenos no', () => {
    montar()
    expect(within(fila('mi mensaje')).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(fila('mi mensaje')).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    expect(within(fila('hola de ana')).queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(within(fila('hola de ana')).queryByRole('button', { name: 'Eliminar' })).toBeNull()
  })

  it('un admin puede borrar mensajes ajenos pero no editarlos', () => {
    rol = 'admin'
    montar()
    expect(within(fila('hola de ana')).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    expect(within(fila('hola de ana')).queryByRole('button', { name: 'Editar' })).toBeNull()
  })

  it('editar abre el campo; Enter guarda y Esc cancela', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.click(within(fila('mi mensaje')).getByRole('button', { name: 'Editar' }))
    const campo = screen.getByRole('textbox', { name: 'Editar mensaje' })
    expect(campo).toHaveValue('mi mensaje')
    await usuario.clear(campo)
    await usuario.type(campo, 'mensaje corregido{Enter}')
    expect(chat.editar).toHaveBeenCalledWith('m2', 'mensaje corregido')
    expect(screen.queryByRole('textbox', { name: 'Editar mensaje' })).toBeNull()

    await usuario.click(within(fila('mi mensaje')).getByRole('button', { name: 'Editar' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Editar mensaje' }), ' extra{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Editar mensaje' })).toBeNull()
    expect(chat.editar).toHaveBeenCalledTimes(1)
  })

  it('guardar sin cambios no manda nada', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.click(within(fila('mi mensaje')).getByRole('button', { name: 'Editar' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Editar mensaje' }), '{Enter}')
    expect(chat.editar).not.toHaveBeenCalled()
  })

  it('con el campo vacío, la flecha arriba edita mi último mensaje', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.click(screen.getByRole('textbox', { name: 'Mensaje para #general' }))
    await usuario.keyboard('{ArrowUp}')
    expect(screen.getByRole('textbox', { name: 'Editar mensaje' })).toHaveValue('mi mensaje')
  })

  it('eliminar pide confirmación y luego borra', async () => {
    montar()
    await userEvent.click(within(fila('mi mensaje')).getByRole('button', { name: 'Eliminar' }))
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ titulo: '¿Eliminar este mensaje?' }))
    expect(chat.borrar).toHaveBeenCalledWith('m2')
    expect(notify).toHaveBeenCalledWith('exito', 'Mensaje eliminado')
  })

  it('un mensaje editado lo indica', () => {
    chat.mensajes = [mensaje('m1', 'ana', 'texto nuevo', { editadoMs: 5000 })]
    montar()
    expect(within(fila('texto nuevo')).getByText('(editado)')).toBeInTheDocument()
  })
})
