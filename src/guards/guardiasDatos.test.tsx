import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: {}, auth: {} }))
vi.mock('../services/authService', () => ({ cerrarSesion: vi.fn() }))

import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import { iniciarComoYo, poblarServidor, yo } from '../test/fixtures'
import Can from './Can'
import MemberGuard from './MemberGuard'
import ProtectedRoute from './ProtectedRoute'
import RoleGuard from './RoleGuard'

function abrir(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/app" element={<ProtectedRoute />}>
          <Route index element={<p>pantalla app</p>} />
          <Route path="s/:serverId" element={<MemberGuard />}>
            <Route index element={<Can roles={['propietario']} fallback={<p>sin puerto</p>}><p>boton dueno</p></Can>} />
            <Route element={<RoleGuard />}>
              <Route path="ajustes" element={<p>pantalla ajustes</p>} />
            </Route>
          </Route>
        </Route>
        <Route path="/404" element={<p>pantalla 404</p>} />
        <Route path="/login" element={<p>pantalla login</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
const poner = (estado: 'inactivo' | 'cargando' | 'listo' | 'error') => act(() => useDatosStore.getState().ponerEstado(estado))

describe('guardias con la carga de datos de Firestore', () => {
  beforeEach(() => {
    iniciarComoYo()
    useAuthStore.setState({ usuario: yo })
  })

  it('ProtectedRoute muestra la pantalla de carga (role=status) mientras los datos están cargando', () => {
    for (const e of ['inactivo', 'cargando'] as const) {
      poner(e)
      const { unmount } = abrir('/app')
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByText('pantalla app')).toBeNull()
      unmount()
    }
  })

  it('ProtectedRoute deja pasar con los datos listos o en error', () => {
    poner('error')
    abrir('/app')
    expect(screen.getByText('pantalla app')).toBeInTheDocument()
  })

  it('MemberGuard suelto: carga con estado «cargando» y con el servidor pendiente, sin ir a /404', () => {
    poner('cargando')
    render(
      <MemoryRouter initialEntries={['/s/A']}>
        <Routes>
          <Route path="/s/:serverId" element={<MemberGuard />}><Route index element={<p>dentro</p>} /></Route>
          <Route path="/404" element={<p>pantalla 404</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('pantalla 404')).toBeNull()
    poblarServidor('A', [['yo', 'miembro']])
    poner('listo')
    act(() => useDatosStore.getState().marcarPendiente('A'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => useDatosStore.getState().quitarPendiente('A'))
    expect(screen.getByText('dentro')).toBeInTheDocument()
  })

  it('RoleGuard suelto: carga con estado «cargando»', () => {
    poblarServidor('A', [['yo', 'propietario']])
    poner('cargando')
    render(
      <MemoryRouter initialEntries={['/s/A']}>
        <Routes>
          <Route path="/s/:serverId" element={<RoleGuard />}><Route index element={<p>ajustes</p>} /></Route>
          <Route path="/404" element={<p>pantalla 404</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('pantalla 404')).toBeNull()
  })

  it('con los datos listos y sin membresía va a /404', () => {
    poner('listo')
    abrir('/app/s/NOEXISTE')
    expect(screen.getByText('pantalla 404')).toBeInTheDocument()
  })

  it('un miembro raso no entra a la ruta de gestores', () => {
    poblarServidor('A', [['yo', 'miembro']])
    abrir('/app/s/A/ajustes')
    expect(screen.getByText('pantalla 404')).toBeInTheDocument()
  })

  it('si el rol cambia en el store, Can y RoleGuard se actualizan sin navegar', () => {
    poblarServidor('A', [['yo', 'miembro']])
    abrir('/app/s/A')
    expect(screen.getByText('sin puerto')).toBeInTheDocument()
    act(() => poblarServidor('A', [['yo', 'propietario']]))
    expect(screen.getByText('boton dueno')).toBeInTheDocument()
  })

  it('RoleGuard reacciona al cambio de rol dentro de la ruta', () => {
    poblarServidor('A', [['yo', 'propietario']])
    abrir('/app/s/A/ajustes')
    expect(screen.getByText('pantalla ajustes')).toBeInTheDocument()
    act(() => poblarServidor('A', [['yo', 'miembro']]))
    expect(screen.getByText('pantalla 404')).toBeInTheDocument()
  })

  it('si me retiran estando dentro, MemberGuard pasa a /404', () => {
    poblarServidor('A', [['yo', 'miembro']])
    abrir('/app/s/A')
    act(() => useDatosStore.getState().quitarServidor('A'))
    expect(screen.getByText('pantalla 404')).toBeInTheDocument()
  })
})
