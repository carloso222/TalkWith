import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))

import { registro, reiniciar } from '../test/firestoreMock'
import { iniciarComoYo, poblarServidor } from '../test/fixtures'
import type { Rol } from '../types'
import { memberService } from './miembros'

const preparar = (miRol: Rol) =>
  poblarServidor('A', [['yo', miRol], ['dueno', miRol === 'propietario' ? 'miembro' : 'propietario'], ['adm', 'admin'], ['mie', 'miembro']])

describe('memberService', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
  })

  it('lecturas: getByServer, roleOf e isMember salen de la caché', async () => {
    preparar('miembro')
    expect((await memberService.getByServer('A')).map((m) => m.uid).sort()).toEqual(['adm', 'dueno', 'mie', 'yo'])
    expect(await memberService.getByServer('Z')).toEqual([])
    expect(memberService.roleOf('A')).toBe('miembro')
    expect(memberService.roleOf('A', 'dueno')).toBe('propietario')
    expect(memberService.roleOf('Z')).toBeNull()
    expect(memberService.isMember('A')).toBe(true)
    expect(memberService.isMember('Z')).toBe(false)
  })

  it('el propietario asigna rol a otros y escribe solo {rol}', async () => {
    preparar('propietario')
    await memberService.setRole('A', 'mie', 'admin')
    await memberService.remove('A', 'adm')
    expect(registro.escrituras).toEqual([
      { op: 'update', ruta: 'servidores/A/miembros/mie', datos: { rol: 'admin' } },
      { op: 'delete', ruta: 'servidores/A/miembros/adm' },
    ])
  })

  it('el propietario no se degrada ni se retira ni sale; no toca a otro propietario', async () => {
    preparar('propietario')
    await expect(memberService.setRole('A', 'yo', 'miembro')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.remove('A', 'yo')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.leave('A')).rejects.toMatchObject({ status: 403 })
    expect(registro.escrituras).toEqual([])
  })

  it('el admin solo retira miembros, no cambia roles y puede salir', async () => {
    preparar('admin')
    await expect(memberService.setRole('A', 'mie', 'admin')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.remove('A', 'dueno')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.remove('A', 'adm')).rejects.toMatchObject({ status: 403 })
    expect(registro.escrituras).toEqual([])
    await memberService.remove('A', 'mie')
    await memberService.leave('A')
    expect(registro.escrituras.map((e) => e.ruta)).toEqual(['servidores/A/miembros/mie', 'servidores/A/miembros/yo'])
  })

  it('un miembro no cambia roles ni retira, pero sí puede salir', async () => {
    preparar('miembro')
    await expect(memberService.setRole('A', 'adm', 'miembro')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.remove('A', 'mie')).rejects.toMatchObject({ status: 403 })
    expect(registro.escrituras).toEqual([])
    await memberService.leave('A')
    expect(registro.escrituras).toEqual([{ op: 'delete', ruta: 'servidores/A/miembros/yo' }])
  })

  it('una persona que ya no está en la caché da 404', async () => {
    preparar('propietario')
    await expect(memberService.setRole('A', 'fantasma', 'admin')).rejects.toMatchObject({ status: 404 })
    await expect(memberService.remove('A', 'fantasma')).rejects.toMatchObject({ status: 404 })
  })

  it('traduce permission-denied de Firestore a ApiError 403', async () => {
    preparar('propietario')
    registro.falla = { code: 'permission-denied' }
    await expect(memberService.setRole('A', 'mie', 'admin')).rejects.toMatchObject({ status: 403, message: 'No tienes permiso para hacer esto.' })
  })

  it('un error desconocido se relanza tal cual', async () => {
    preparar('propietario')
    registro.falla = { code: 'otra-cosa' }
    await expect(memberService.remove('A', 'mie')).rejects.toMatchObject({ code: 'otra-cosa' })
  })

  it('usa el rol real de Firestore, no el rolDemo', async () => {
    preparar('miembro')
    const { useAuthStore } = await import('../store/authStore')
    useAuthStore.setState({ rolDemo: 'propietario' })
    await expect(memberService.setRole('A', 'mie', 'admin')).rejects.toMatchObject({ status: 403 })
    expect(registro.escrituras).toEqual([])
  })
})
