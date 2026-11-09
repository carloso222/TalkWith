import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', async () => (await import('../test/firestoreMock')).mockFirestore)
vi.mock('../lib/firebase', () => ({ db: { tipo: 'db' }, auth: { currentUser: { email: 'yo@test.com' } } }))
vi.mock('./authService', () => ({ cerrarSesion: vi.fn() }))
vi.mock('./firestore/escuchas', () => ({ esperarServidor: vi.fn(async () => {}), detenerEscuchas: vi.fn() }))

import { Timestamp } from 'firebase/firestore'
import { useDatosStore } from '../store/datosStore'
import { registro, reiniciar } from '../test/firestoreMock'
import { iniciarComoYo, poblarServidor } from '../test/fixtures'
import { esperarServidor } from './firestore/escuchas'
import { crearCodigo, inviteService, leerCodigo } from './invitaciones'

const CODIGO = 'arte-digital-5mz8'

function invitacion(vence: number) {
  return {
    servidorId: 'arte', invitaUid: 'sofia', creadaEn: Timestamp.fromMillis(1), expiraEn: Timestamp.fromMillis(vence),
    servidorNombre: 'Arte Digital', servidorIniciales: 'AD', servidorColor: '#0ea5e9',
  }
}

describe('crearCodigo', () => {
  it('usa crypto.getRandomValues, cumple el patrón y no se repite en 1000 intentos', () => {
    const espia = vi.spyOn(crypto, 'getRandomValues')
    const codigos = new Set(Array.from({ length: 1000 }, () => crearCodigo('Club de Diseño UX')))
    expect(espia).toHaveBeenCalled()
    expect(codigos.size).toBe(1000)
    for (const c of codigos) expect(c).toMatch(/^[a-z0-9-]{12,64}$/)
    espia.mockRestore()
  })

  it('un nombre largo o vacío sigue dando un código válido', () => {
    expect(crearCodigo('x'.repeat(200))).toMatch(/^[a-z0-9-]{12,64}$/)
    expect(crearCodigo('¡¡¡')).toMatch(/^servidor-[a-z0-9]{12}$/)
  })

  it('leerCodigo acepta el enlace completo o solo el código', () => {
    expect(leerCodigo(' talkwith.app/i/Arte-Digital-5MZ8 ')).toBe(CODIGO)
    expect(leerCodigo(CODIGO)).toBe(CODIGO)
  })
})

describe('inviteService', () => {
  beforeEach(() => {
    reiniciar()
    iniciarComoYo()
    vi.mocked(esperarServidor).mockReset()
    vi.mocked(esperarServidor).mockResolvedValue()
    registro.docs.set(`invitaciones/${CODIGO}`, invitacion(Date.now() + 5 * 3_600_000 - 1000))
    registro.docs.set('usuarios/sofia', { nombre: 'Sofía', iniciales: 'S', color: '#fff', estado: 'en-linea' })
  })

  it('validate devuelve null sin consultar para códigos vacíos o fuera del patrón', async () => {
    for (const texto of ['', '   ', 'corto', 'talkwith.app/i/', '../servidores/A', 'a/b/..', 'CODIGO CON ESPACIOS', 'x'.repeat(65)]) {
      expect(await inviteService.validate(texto)).toBeNull()
    }
    expect(registro.lecturas).toEqual([])
  })

  it('validate devuelve null para una invitación vencida o inexistente', async () => {
    registro.docs.set('invitaciones/vencida-0000000', invitacion(Date.now() - 1000))
    expect(await inviteService.validate('vencida-0000000')).toBeNull()
    expect(await inviteService.validate('no-existe-123456')).toBeNull()
  })

  it('validate de una invitación vigente da la vista previa y guarda la previa en la caché', async () => {
    const r = await inviteService.validate(`talkwith.app/i/${CODIGO.toUpperCase()}`)
    expect(r).toMatchObject({ codigo: CODIGO, servidorId: 'arte', invitaUid: 'sofia', expiraEn: '5 h', enLinea: 0, enLlamada: 0 })
    expect(useDatosStore.getState().previas.arte).toMatchObject({ nombre: 'Arte Digital', iniciales: 'AD', totalMiembros: 0 })
    expect(useDatosStore.getState().perfiles.sofia).toBeDefined()
  })

  it('validate de un servidor del que ya soy miembro no guarda previa', async () => {
    poblarServidor('arte', [['yo', 'miembro']])
    await inviteService.validate(CODIGO)
    expect(useDatosStore.getState().previas.arte).toBeUndefined()
  })

  it('join escribe exactamente las seis claves y espera a la caché antes de resolver', async () => {
    let abrir!: () => void
    const puerta = new Promise<void>((r) => { abrir = r })
    vi.mocked(esperarServidor).mockImplementation(async (sid) => {
      await puerta
      poblarServidor(sid, [['yo', 'miembro']], [], 'Arte Digital')
    })
    let resuelto = false
    const promesa = inviteService.join(`talkwith.app/i/${CODIGO}`).then((s) => {
      resuelto = true
      return s
    })
    await vi.waitFor(() => expect(registro.escrituras).toHaveLength(1))
    expect(resuelto).toBe(false)

    const [e] = registro.escrituras
    expect(e).toMatchObject({ op: 'set', ruta: 'servidores/arte/miembros/yo' })
    expect(Object.keys(e.datos!).sort()).toEqual(['codigoInvitacion', 'correo', 'rol', 'servidorId', 'uid', 'unidoEn'])
    expect(e.datos).toEqual({ uid: 'yo', servidorId: 'arte', rol: 'miembro', unidoEn: 'MARCA_SERVIDOR', correo: 'yo@test.com', codigoInvitacion: CODIGO })

    abrir()
    expect((await promesa).servidorId).toBe('arte')
    expect(esperarServidor).toHaveBeenCalledWith('arte')
  })

  it('join da 409 si ya es miembro y 404 si la invitación no sirve, sin escribir', async () => {
    poblarServidor('arte', [['yo', 'miembro']], [], 'Arte Digital')
    await expect(inviteService.join(CODIGO)).rejects.toMatchObject({ status: 409 })
    await expect(inviteService.join('no-existe-123456')).rejects.toMatchObject({ status: 404 })
    await expect(inviteService.join('')).rejects.toMatchObject({ status: 404 })
    expect(registro.escrituras).toEqual([])
  })

  it('join traduce permission-denied a 403', async () => {
    registro.falla = { code: 'permission-denied' }
    await expect(inviteService.join(CODIGO)).rejects.toMatchObject({ status: 403 })
  })

  it('getByServer es null si no se creó ninguna invitación en la sesión', async () => {
    expect(await inviteService.getByServer('arte')).toBeNull()
  })
})
