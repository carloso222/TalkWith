import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { leerArgumentos } from './sembrarArgs.ts'
import { documentosDeEjemplo } from './sembrarDatos.ts'

describe('sembrado: argumentos', () => {
  it('aborta sin --uid', () => {
    expect(() => leerArgumentos([], {})).toThrow(/--uid/)
    expect(() => leerArgumentos(['--uid='], {})).toThrow(/--uid/)
    expect(() => leerArgumentos(['--correo=a@b.c'], {})).toThrow(/--uid/)
  })

  it('aborta con un uid raro (rutas, espacios)', () => {
    expect(() => leerArgumentos(['--uid=a/b'], {})).toThrow(/uid/)
    expect(() => leerArgumentos(['--uid=a b'], {})).toThrow(/uid/)
  })

  it('aborta si el proyecto no empieza con demo-', () => {
    expect(() => leerArgumentos(['--uid=abc', '--proyecto=talkwith-prod'], {})).toThrow(/demo-/)
    expect(() => leerArgumentos(['--uid=abc'], { GCLOUD_PROJECT: 'talkwith-prod' })).toThrow(/demo-/)
  })

  it('usa demo-talkwith y un correo de demostración por defecto', () => {
    expect(leerArgumentos(['--uid=abc'], {})).toEqual({ uid: 'abc', correo: 'abc@demo.talkwith', proyecto: 'demo-talkwith' })
    expect(leerArgumentos(['--uid=abc', '--correo=yo@test.com', '--proyecto=demo-otro'], {})).toEqual({ uid: 'abc', correo: 'yo@test.com', proyecto: 'demo-otro' })
  })
})

describe('sembrado: documentos', () => {
  const docs = documentosDeEjemplo('real-uid', 'yo@test.com', Date.UTC(2026, 10, 8))
  const rutas = docs.map(([r]) => r)

  it('es idempotente: ids estables y sin rutas repetidas', () => {
    expect(new Set(rutas).size).toBe(rutas.length)
    expect(documentosDeEjemplo('real-uid', 'yo@test.com', Date.UTC(2026, 10, 8)).map(([r]) => r)).toEqual(rutas)
  })

  it('reemplaza u-carlos por la cuenta real y usa los ids de los mocks', () => {
    expect(rutas.some((r) => r.includes('u-carlos'))).toBe(false)
    expect(rutas).toContain('servidores/estudio-diseno/miembros/real-uid')
    expect(rutas).toContain('servidores/estudio-diseno/canales/general')
    const propio = docs.find(([r]) => r === 'servidores/estudio-diseno/miembros/real-uid')![1]
    expect(propio).toMatchObject({ uid: 'real-uid', rol: 'propietario', correo: 'yo@test.com', servidorId: 'estudio-diseno' })
    expect(docs.find(([r]) => r === 'servidores/dev-latam/miembros/real-uid')![1]).toMatchObject({ rol: 'admin' })
    expect(docs.find(([r]) => r === 'servidores/estudio-diseno')![1]).toMatchObject({ propietarioUid: 'real-uid' })
  })

  it('las invitaciones van en minúsculas y no hay miembro propio en Arte Digital', () => {
    expect(rutas).toContain('invitaciones/arte-digital-5mz8')
    expect(rutas).toContain('invitaciones/club-lectura-7kd2')
    expect(rutas).not.toContain('servidores/arte-digital/miembros/real-uid')
    for (const [r, d] of docs.filter(([r]) => r.startsWith('invitaciones/'))) {
      expect(r.split('/')[1]).toMatch(/^[a-z0-9-]{12,64}$/)
      expect(Object.keys(d).sort()).toEqual(['creadaEn', 'expiraEn', 'invitaUid', 'servidorColor', 'servidorId', 'servidorIniciales', 'servidorNombre'])
    }
  })

  it('los canales no llevan claves ajenas a las reglas (p. ej. menciones)', () => {
    for (const [r, d] of docs.filter(([r]) => r.includes('/canales/'))) {
      expect(Object.keys(d).every((k) => ['servidorId', 'nombre', 'tipo', 'descripcion', 'privado'].includes(k)), r).toBe(true)
    }
  })
})

describe('sembrado: aislamiento', () => {
  it('ningún archivo de src/ importa el script de sembrado', () => {
    const recorrer = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? recorrer(join(dir, n)) : [join(dir, n)]))
    const culpables = recorrer('src').filter((f) => /\.(ts|tsx)$/.test(f) && /scripts\/sembrar|sembrarDatos|sembrarArgs/.test(readFileSync(f, 'utf8')))
    expect(culpables).toEqual([])
  })

  it('el script exige un proyecto demo- y no se llama desde el flujo de CI', () => {
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).not.toMatch(/sembrar/)
  })
})
