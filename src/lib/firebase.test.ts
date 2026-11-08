import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  authStateReady: vi.fn(async () => {}),
  currentUser: null as null | { getIdToken: () => Promise<string> },
}))

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({ getAuth: () => auth, connectAuthEmulator: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getFirestore: () => ({}), connectFirestoreEmulator: vi.fn() }))
vi.mock('firebase/storage', () => ({ getStorage: () => ({}), connectStorageEmulator: vi.fn() }))

import { obtenerTokenSocket } from './firebase'

describe('obtenerTokenSocket', () => {
  beforeEach(() => {
    auth.currentUser = null
  })

  it('regresa el token del usuario actual', async () => {
    auth.currentUser = { getIdToken: async () => 'token-123' }
    await expect(obtenerTokenSocket()).resolves.toBe('token-123')
    expect(auth.authStateReady).toHaveBeenCalled()
  })

  it('lanza "Sin sesión" si no hay usuario', async () => {
    await expect(obtenerTokenSocket()).rejects.toThrow('Sin sesión')
  })
})
