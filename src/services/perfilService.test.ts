import type { User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fs = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
}))

vi.mock('../lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...ruta: string[]) => ({ ruta: ruta.join('/') }),
  getDoc: fs.getDoc,
  setDoc: fs.setDoc,
  serverTimestamp: () => 'MARCA',
  writeBatch: vi.fn(),
}))

import { asegurarPerfil } from './perfilService'

const google = { uid: 'abc', email: 'ana@gmail.com', displayName: 'Ana Pérez', photoURL: 'https://foto/ana.png' } as User

describe('asegurarPerfil', () => {
  beforeEach(() => {
    fs.getDoc.mockReset()
    fs.setDoc.mockClear()
  })

  it('primer login: crea usuarios/{uid} sin correo y el perfil queda incompleto', async () => {
    fs.getDoc.mockResolvedValue({ exists: () => false })
    const r = await asegurarPerfil(google)
    expect(r.perfilCompleto).toBe(false)
    expect(r.usuario.correo).toBe('ana@gmail.com')
    const [ref, datos] = fs.setDoc.mock.calls[0] as unknown as [{ ruta: string }, Record<string, unknown>]
    expect(ref.ruta).toBe('usuarios/abc')
    expect(datos).not.toHaveProperty('correo')
    expect(datos).not.toHaveProperty('usuario')
    expect(datos).toMatchObject({ nombre: 'Ana Pérez', iniciales: 'AP', fotoUrl: 'https://foto/ana.png' })
  })

  it('login siguiente: hace merge sin pisar usuario ni nombre', async () => {
    fs.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ nombre: 'Ana P.', usuario: 'ana.p', iniciales: 'AP', color: 'azul' }) })
    const r = await asegurarPerfil(google)
    expect(r.perfilCompleto).toBe(true)
    expect(r.usuario).toMatchObject({ nombre: 'Ana P.', usuario: 'ana.p' })
    const [, datos, opciones] = fs.setDoc.mock.calls[0] as unknown as [unknown, Record<string, unknown>, { merge: boolean }]
    expect(opciones).toEqual({ merge: true })
    expect(datos).not.toHaveProperty('usuario')
    expect(datos).not.toHaveProperty('nombre')
    expect(datos).not.toHaveProperty('correo')
  })
})
