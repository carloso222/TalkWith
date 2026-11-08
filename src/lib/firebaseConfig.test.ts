import { describe, expect, it } from 'vitest'
import { leerConfigFirebase } from './firebaseConfig'

const env = (valores: Record<string, unknown>) => valores as unknown as ImportMetaEnv

describe('leerConfigFirebase', () => {
  it('usa emuladores con VITE_USE_EMULATORS=true', () => {
    const r = leerConfigFirebase(env({ VITE_USE_EMULATORS: 'true', VITE_FIREBASE_API_KEY: 'k', PROD: false }))
    expect(r.usarEmuladores).toBe(true)
  })

  it('sin apiKey y fuera de producción usa emuladores con valores demo', () => {
    const r = leerConfigFirebase(env({ PROD: false }))
    expect(r.usarEmuladores).toBe(true)
    expect(r.opciones.projectId).toBe('demo-talkwith')
    expect(r.opciones.apiKey).toBe('demo-key')
  })

  it('en producción sin apiKey lanza error', () => {
    expect(() => leerConfigFirebase(env({ PROD: true }))).toThrow('Falta la configuración de Firebase')
  })

  it('con configuración completa y sin bandera no usa emuladores', () => {
    const r = leerConfigFirebase(env({ VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_PROJECT_ID: 'talkwith', PROD: true }))
    expect(r.usarEmuladores).toBe(false)
    expect(r.opciones.projectId).toBe('talkwith')
  })
})
