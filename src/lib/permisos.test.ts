import { describe, expect, it } from 'vitest'
import type { Rol } from '../types'
import { puedeCambiarRol, puedeRetirar, puedeSalir } from './permisos'

const YO = 'yo'
const roles: Rol[] = ['propietario', 'admin', 'miembro']

/** Espejo de la matriz de roles de firestore.rules (miembros: update y delete). */
const CAMBIAR: Record<Rol, Partial<Record<Rol, boolean>>> = {
  propietario: { propietario: false, admin: true, miembro: true },
  admin: {},
  miembro: {},
}
const RETIRAR: Record<Rol, Record<Rol, boolean>> = {
  propietario: { propietario: false, admin: true, miembro: true },
  admin: { propietario: false, admin: false, miembro: true },
  miembro: { propietario: false, admin: false, miembro: false },
}

describe('lib/permisos (espejo de las reglas)', () => {
  for (const mio of roles) {
    for (const objetivo of roles) {
      it(`${mio} sobre otra persona ${objetivo}: cambiar rol y retirar`, () => {
        const o = { uid: 'otra', rol: objetivo }
        expect(puedeCambiarRol(mio, YO, o)).toBe(CAMBIAR[mio][objetivo] ?? false)
        expect(puedeRetirar(mio, YO, o)).toBe(RETIRAR[mio][objetivo])
      })
    }
    it(`${mio} sobre sí mismo: no cambia su rol ni se «retira»`, () => {
      const yoMismo = { uid: YO, rol: mio }
      expect(puedeCambiarRol(mio, YO, yoMismo)).toBe(false)
      expect(puedeRetirar(mio, YO, yoMismo)).toBe(false)
    })
  }

  it('salir: todos menos la persona propietaria; sin rol, no', () => {
    expect(puedeSalir('propietario')).toBe(false)
    expect(puedeSalir('admin')).toBe(true)
    expect(puedeSalir('miembro')).toBe(true)
    expect(puedeSalir(null)).toBe(false)
  })

  it('sin rol (no miembro) no puede nada', () => {
    const o = { uid: 'otra', rol: 'miembro' as Rol }
    expect(puedeCambiarRol(null, YO, o)).toBe(false)
    expect(puedeRetirar(null, YO, o)).toBe(false)
  })
})
