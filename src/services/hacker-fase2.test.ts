import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))

import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import { registro, reiniciar } from '../test/firestoreMock'
import { canal, iniciarComoYo, poblarServidor, yo } from '../test/fixtures'
import { channelService } from './canales'
import { aPerfil, aPrevia, aServidor, colorSeguro } from './firestore/convertidores'
import { crearCodigo } from './invitaciones'
import { inviteService, recordarInvitacion } from './invitaciones'
import { memberService } from './miembros'

/** Hacker, run 20261108-fase2-datos-tw07 (hack-round-1). */

const datos = { nombre: 'avisos', tipo: 'texto' as const, descripcion: '', privado: false }

describe('S2 id de canal repetido entre servidores', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
    // M es un servidor ajeno donde soy admin; su gestor creó un canal con el mismo id que mi «general» de A.
    poblarServidor('M', [['yo', 'admin'], ['mallory', 'propietario']], [canal('M', 'a-general', 'trampa')])
    poblarServidor('A', [['yo', 'propietario']], [canal('A', 'a-general', 'general')])
  })

  it('editar o borrar un id ambiguo no escribe en el servidor equivocado', async () => {
    await expect(channelService.update('a-general', datos)).rejects.toMatchObject({ status: 409 })
    await expect(channelService.remove('a-general')).rejects.toMatchObject({ status: 409 })
    expect(registro.escrituras).toEqual([])
  })

  it('sin ambigüedad sigue funcionando', async () => {
    useDatosStore.getState().ponerCanales('M', [])
    await channelService.remove('a-general')
    expect(registro.escrituras).toEqual([{ op: 'delete', ruta: 'servidores/A/canales/a-general' }])
  })
})

describe('S3 invitaciones recordadas no pasan a otra cuenta en la misma pestaña', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
  })

  it('después de cambiar de cuenta, getByServer no devuelve el código de la cuenta anterior', async () => {
    recordarInvitacion({ codigo: 'estudio-abcdefghjkmn', servidorId: 'A', invitaUid: 'yo', expiraEn: '7 días', enLinea: 1, enLlamada: 0 })
    expect((await inviteService.getByServer('A'))?.codigo).toBe('estudio-abcdefghjkmn')
    useDatosStore.getState().limpiar()
    useAuthStore.setState({ usuario: { ...yo, uid: 'otra' } })
    expect(await inviteService.getByServer('A')).toBeNull()
  })
})

describe('roles con rolDemo en desarrollo', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
    poblarServidor('A', [['yo', 'miembro'], ['dueno', 'propietario'], ['ana', 'miembro'], ['admin', 'admin']])
    useAuthStore.setState({ rolDemo: 'propietario' })
  })

  it('un miembro con rolDemo=propietario no escribe: setRole, remove ni retirar al propietario', async () => {
    await expect(memberService.setRole('A', 'ana', 'admin')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.remove('A', 'ana')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.remove('A', 'dueno')).rejects.toMatchObject({ status: 403 })
    await expect(memberService.setRole('A', 'admin', 'miembro')).rejects.toMatchObject({ status: 403 })
    expect(registro.escrituras).toEqual([])
  })
})

describe('valores de Firestore que terminan en estilos', () => {
  const cargas = [
    'red;background:url(https://evil.test/x)',
    '#fff;position:fixed',
    'url(javascript:alert(1))',
    'expression(alert(1))',
    'var(--x)',
    '#12345g',
    '#fff\n',
    ' #fff',
    { toString: () => '#fff' },
    ['#fff'],
  ]

  it('colorSeguro solo deja pasar hexadecimales', () => {
    for (const c of cargas) expect(colorSeguro(c)).toBe('#6366f1')
    expect(colorSeguro('#0ea5e9')).toBe('#0ea5e9')
  })

  it('servidor, perfil y vista previa pasan el color por colorSeguro', () => {
    const snap = (d: Record<string, unknown>) => ({ id: 'x', data: () => d }) as never
    const malo = 'red;background-image:url(//evil.test)'
    expect(aServidor(snap({ nombre: 'S', color: malo })).color).toBe('#6366f1')
    expect(aPerfil(snap({ nombre: 'P', color: malo })).color).toBe('#6366f1')
    expect(aPrevia({ servidorId: 'S', servidorColor: malo }).color).toBe('#6366f1')
    // fotoUrl nunca llega al perfil de la caché
    expect('fotoUrl' in aPerfil(snap({ nombre: 'P', fotoUrl: 'javascript:alert(1)' }))).toBe(false)
  })
})

describe('códigos de invitación', () => {
  it('validate no consulta rutas para códigos con barras, puntos o mayúsculas raras', async () => {
    reiniciar()
    iniciarComoYo()
    for (const c of ['', '../../usuarios/yo', 'talkwith.app/i/..', 'a'.repeat(65), 'código-con-acento', '%2e%2e%2fusuarios']) {
      expect(await inviteService.validate(c)).toBeNull()
    }
    expect(registro.lecturas).toEqual([])
  })

  it('el sufijo aleatorio tiene 12 símbolos de un alfabeto de 31', () => {
    const sufijos = Array.from({ length: 500 }, () => crearCodigo('Club').split('-').pop()!)
    for (const s of sufijos) expect(s).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{12}$/)
    expect(new Set(sufijos).size).toBe(500)
  })
})
