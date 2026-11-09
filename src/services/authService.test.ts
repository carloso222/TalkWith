import { beforeEach, describe, expect, it, vi } from 'vitest'

const orden = vi.hoisted(() => [] as string[])

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(async () => {
    orden.push('signOut')
  }),
}))
vi.mock('../lib/firebase', () => ({ auth: { tipo: 'auth' } }))
vi.mock('./firestore/escuchas', () => ({
  detenerEscuchas: vi.fn(() => {
    orden.push('detenerEscuchas')
  }),
}))

import { cerrarSesion } from './authService'

describe('cerrarSesion', () => {
  beforeEach(() => {
    orden.length = 0
  })

  it('detiene las escuchas de Firestore antes de llamar a signOut', async () => {
    await cerrarSesion()
    expect(orden).toEqual(['detenerEscuchas', 'signOut'])
  })
})
