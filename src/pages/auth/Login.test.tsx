import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const firebase = vi.hoisted(() => ({ signInWithPopup: vi.fn() }))

vi.mock('../../lib/firebase', () => ({ auth: { nombre: 'auth-falso' } }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInWithPopup: firebase.signInWithPopup,
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

import { GoogleAuthProvider } from 'firebase/auth'
import Login from './Login'

const abrir = () => render(<MemoryRouter><Login /></MemoryRouter>)
const botonGoogle = () => screen.getByRole('button', { name: /continuar con google/i })

describe('Login', () => {
  beforeEach(() => {
    firebase.signInWithPopup.mockReset()
  })

  it('llama a signInWithPopup con GoogleAuthProvider', async () => {
    firebase.signInWithPopup.mockResolvedValue({})
    abrir()
    await userEvent.click(botonGoogle())
    expect(firebase.signInWithPopup).toHaveBeenCalledTimes(1)
    expect(firebase.signInWithPopup.mock.calls[0][1]).toBeInstanceOf(GoogleAuthProvider)
  })

  it('no muestra error si se cancela el popup', async () => {
    firebase.signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' })
    abrir()
    await userEvent.click(botonGoogle())
    await waitFor(() => expect(botonGoogle()).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('muestra un alert si el navegador bloquea el popup', async () => {
    firebase.signInWithPopup.mockRejectedValue({ code: 'auth/popup-blocked' })
    abrir()
    await userEvent.click(botonGoogle())
    expect(await screen.findByRole('alert')).toHaveTextContent(/bloque/i)
  })

  it('ya no ofrece contraseña', () => {
    abrir()
    const tipos = Array.from(document.querySelectorAll('input')).map((i) => i.getAttribute('type'))
    expect(tipos).not.toContain('pass' + 'word')
  })
})
