import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../../test/firestoreMock')).mockFirestore)
vi.mock('../../lib/firebase', () => ({ db: {}, auth: {} }))
vi.mock('../../services/authService', () => ({ cerrarSesion: vi.fn() }))

import { ApiError, memberService } from '../../services'
import { useDatosStore } from '../../store/datosStore'
import { useUiStore } from '../../store/uiStore'
import { iniciarComoYo, poblarServidor } from '../../test/fixtures'
import type { Rol } from '../../types'
import Miembros from './Miembros'

const perfil = (uid: string, nombre: string) => ({ uid, nombre, usuario: uid, iniciales: nombre.slice(0, 2), color: '#6366f1', estado: 'en-linea' as const })

function abrir(miRol: Rol) {
  iniciarComoYo()
  poblarServidor('A', [['yo', miRol], ['dueno', miRol === 'propietario' ? 'miembro' : 'propietario'], ['adm', 'admin'], ['mie', 'miembro']])
  const s = useDatosStore.getState()
  s.ponerPerfil('dueno', perfil('dueno', 'Dueña Uno'))
  s.ponerPerfil('adm', perfil('adm', 'Admin Dos'))
  s.ponerPerfil('mie', perfil('mie', 'Miembro Tres'))
  return render(
    <MemoryRouter initialEntries={['/s/A']}>
      <Routes>
        <Route path="/s/:serverId" element={<Miembros />} />
        <Route path="/app" element={<p>inicio</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const selectores = () => screen.queryAllByRole('combobox', { name: /^Rol de / })
const retirar = () => screen.queryAllByRole('button', { name: 'Retirar' })
const salir = () => screen.queryAllByRole('button', { name: 'Salir' })

describe('Miembros (TW 07)', () => {
  beforeEach(() => {
    useUiStore.setState({ toasts: [], dialogo: null })
  })
  afterEach(() => vi.restoreAllMocks())

  it('el propietario ve el selector Administrador/Miembro y «Retirar» en toda fila no propietaria', async () => {
    abrir('propietario')
    await screen.findByText('Miembro Tres')
    expect(selectores()).toHaveLength(3)
    const opciones = within(selectores()[0]).getAllByRole('option').map((o) => o.textContent)
    expect(opciones).toEqual(['Administrador', 'Miembro'])
    expect(retirar()).toHaveLength(3)
    expect(salir()).toHaveLength(0)
  })

  it('un admin no ve selectores; ve «Retirar» solo en filas miembro y «Salir» en la suya', async () => {
    abrir('admin')
    await screen.findByText('Miembro Tres')
    expect(selectores()).toHaveLength(0)
    expect(retirar()).toHaveLength(1)
    expect(salir()).toHaveLength(1)
  })

  it('un miembro no ve selectores, «Retirar» ni «Salir»', async () => {
    abrir('miembro')
    await screen.findByText('Miembro Tres')
    expect(selectores()).toHaveLength(0)
    expect(retirar()).toHaveLength(0)
    expect(salir()).toHaveLength(0)
  })

  it('cambiar el selector llama a setRole(sid, uid, rol) y avisa', async () => {
    const espia = vi.spyOn(memberService, 'setRole').mockResolvedValue()
    abrir('propietario')
    await screen.findByText('Miembro Tres')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rol de Miembro Tres' }), 'admin')
    expect(espia).toHaveBeenCalledWith('A', 'mie', 'admin')
    await vi.waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.tipo === 'exito' && t.titulo === 'Rol actualizado')).toBe(true))
  })

  it('confirmar «Retirar» llama a remove', async () => {
    const espia = vi.spyOn(memberService, 'remove').mockResolvedValue()
    abrir('propietario')
    await screen.findByText('Miembro Tres')
    const fila = screen.getByText('Miembro Tres').closest('tr')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Retirar' }))
    expect(espia).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }))
    expect(espia).toHaveBeenCalledWith('A', 'mie')
  })

  it('un error al cambiar el rol muestra un toast de error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(memberService, 'setRole').mockRejectedValue(new ApiError(403, 'No tienes permiso para hacer esto.'))
    abrir('propietario')
    await screen.findByText('Miembro Tres')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rol de Miembro Tres' }), 'admin')
    await vi.waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.tipo === 'error')).toBe(true))
  })

  it('«Salir» pide confirmación, llama a leave y va al inicio', async () => {
    const espia = vi.spyOn(memberService, 'leave').mockResolvedValue()
    abrir('admin')
    await screen.findByText('Miembro Tres')
    const clic = userEvent.click(salir()[0])
    await vi.waitFor(() => expect(useUiStore.getState().dialogo).not.toBeNull())
    expect(espia).not.toHaveBeenCalled()
    useUiStore.getState().cerrarDialogo(true)
    await clic
    await vi.waitFor(() => expect(espia).toHaveBeenCalledWith('A'))
    expect(await screen.findByText('inicio')).toBeInTheDocument()
  })

  it('si se cancela la confirmación de «Salir» no se llama a leave', async () => {
    const espia = vi.spyOn(memberService, 'leave').mockResolvedValue()
    abrir('admin')
    await screen.findByText('Miembro Tres')
    await userEvent.click(salir()[0])
    await vi.waitFor(() => expect(useUiStore.getState().dialogo).not.toBeNull())
    useUiStore.getState().cerrarDialogo(false)
    expect(espia).not.toHaveBeenCalled()
  })
})
