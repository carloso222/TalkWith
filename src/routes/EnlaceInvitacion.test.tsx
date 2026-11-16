import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { describe, expect, it } from 'vitest'
import EnlaceInvitacion from './EnlaceInvitacion'

function UnirseFalso() {
  const { codigo } = useParams()
  return <p>unirse con {codigo}</p>
}

describe('enlace de invitación /i/:codigo', () => {
  it('lleva a Unirse con el código ya escrito', () => {
    render(
      <MemoryRouter initialEntries={['/i/club-lectura-k3m9x2q7vb4n']}>
        <Routes>
          <Route path="/i/:codigo" element={<EnlaceInvitacion />} />
          <Route path="/app/unirse/:codigo" element={<UnirseFalso />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('unirse con club-lectura-k3m9x2q7vb4n')).toBeInTheDocument()
  })
})
