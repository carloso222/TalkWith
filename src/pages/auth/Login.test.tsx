import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const firebase = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock('../../lib/firebase', () => ({ auth: { nombre: 'auth-falso' } }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  ...firebase,
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

import { GoogleAuthProvider } from 'firebase/auth'
import Login from './Login'

const abrir = () => render(<MemoryRouter><Login /></MemoryRouter>)
const botonGoogle = () => screen.getByRole('button', { name: /continuar con google/i })
const escribir = async (etiqueta: string, texto: string) => userEvent.type(screen.getByLabelText(etiqueta), texto)

describe('Login', () => {
  beforeEach(() => {
    Object.values(firebase).forEach((f) => f.mockReset())
  })

  describe('con Google', () => {
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
  })

  describe('con correo y contraseña', () => {
    it('inicia sesión con el correo sin espacios', async () => {
      firebase.signInWithEmailAndPassword.mockResolvedValue({})
      abrir()
      await escribir('Correo', '  ana@correo.com ')
      await escribir('Contraseña', 'secreta123')
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
      expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'ana@correo.com', 'secreta123')
    })

    it('valida antes de llamar a Firebase', async () => {
      abrir()
      await escribir('Correo', 'no-es-correo')
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
      expect(screen.getByText('Ese correo no es válido.')).toBeInTheDocument()
      expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
      expect(firebase.signInWithEmailAndPassword).not.toHaveBeenCalled()
    })

    it('da el mismo mensaje si el correo no existe o la contraseña está mal', async () => {
      abrir()
      await escribir('Correo', 'ana@correo.com')
      await escribir('Contraseña', 'mala')
      for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
        firebase.signInWithEmailAndPassword.mockRejectedValueOnce({ code })
        await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
      }
    })

    it('crea la cuenta y manda el correo de verificación', async () => {
      const user = { uid: 'nuevo' }
      firebase.createUserWithEmailAndPassword.mockResolvedValue({ user })
      firebase.sendEmailVerification.mockResolvedValue(undefined)
      abrir()
      await userEvent.click(screen.getByRole('button', { name: 'Crea una' }))
      await escribir('Correo', 'ana@correo.com')
      await escribir('Contraseña', 'secreta123')
      await escribir('Confirma tu contraseña', 'secreta123')
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
      expect(firebase.createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'ana@correo.com', 'secreta123')
      expect(firebase.sendEmailVerification).toHaveBeenCalledWith(user)
    })

    it('al crear cuenta exige contraseña segura y que coincidan', async () => {
      abrir()
      await userEvent.click(screen.getByRole('button', { name: 'Crea una' }))
      await escribir('Correo', 'ana@correo.com')
      await escribir('Contraseña', 'solotexto')
      await escribir('Confirma tu contraseña', 'otra')
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
      expect(screen.getByText('Usa letras y números.')).toBeInTheDocument()
      expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
      expect(firebase.createUserWithEmailAndPassword).not.toHaveBeenCalled()
    })

    it('avisa si el correo ya tiene cuenta', async () => {
      firebase.createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' })
      abrir()
      await userEvent.click(screen.getByRole('button', { name: 'Crea una' }))
      await escribir('Correo', 'ana@correo.com')
      await escribir('Contraseña', 'secreta123')
      await escribir('Confirma tu contraseña', 'secreta123')
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/ya tiene una cuenta/i)
    })

    it('restablecer contraseña no revela si el correo existe', async () => {
      firebase.sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' })
      abrir()
      await escribir('Correo', 'nadie@correo.com')
      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }))
      expect(firebase.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'nadie@correo.com')
      expect(await screen.findByRole('status')).toHaveTextContent(/si hay una cuenta con ese correo/i)
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('restablecer contraseña pide el correo primero', async () => {
      abrir()
      await userEvent.click(screen.getByRole('button', { name: /olvidaste tu contraseña/i }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/escribe tu correo/i)
      expect(firebase.sendPasswordResetEmail).not.toHaveBeenCalled()
    })
  })
})
