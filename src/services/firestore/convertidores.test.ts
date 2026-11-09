import { describe, expect, it } from 'vitest'
import { aCanal, aMiembro, aPerfil, aPrevia, colorSeguro, expiraEn, fecha, ordenarCanales } from './convertidores'

const marca = (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) })
const snap = (id: string, datos: Record<string, unknown>) => ({ id, data: () => datos }) as never

describe('convertidores de Firestore', () => {
  it('colorSeguro solo acepta hexadecimales', () => {
    expect(colorSeguro('#6366f1')).toBe('#6366f1')
    expect(colorSeguro('#fff')).toBe('#fff')
    for (const malo of ['red', 'url(javascript:alert(1))', '#zzz', '#1234567890', 5, undefined, '#fff;color:red']) {
      expect(colorSeguro(malo)).toBe('#6366f1')
    }
  })

  it('fecha y expiraEn', () => {
    expect(fecha(marca(Date.UTC(2026, 8, 2, 12)))).toBe('2026-09-02')
    expect(fecha('2026-09-02')).toBe('')
    const ahora = 1_000_000
    expect(expiraEn(marca(ahora + 7 * 24 * 3_600_000 - 5), ahora)).toBe('7 días')
    expect(expiraEn(marca(ahora + 24 * 3_600_000), ahora)).toBe('1 día')
    expect(expiraEn(marca(ahora + 5 * 3_600_000 - 5), ahora)).toBe('5 h')
    expect(expiraEn(marca(ahora - 1), ahora)).toBe('vencida')
    expect(expiraEn(undefined, ahora)).toBe('')
  })

  it('aMiembro rechaza roles inválidos y toma el uid del id del documento', () => {
    expect(aMiembro(snap('u1', { rol: 'dios' }), 'A')).toBeNull()
    expect(aMiembro(snap('u1', { rol: 'admin', unidoEn: marca(Date.UTC(2026, 0, 5)), correo: 'a@b.c', grupo: 'G' }), 'A')).toEqual({
      miembroId: 'u1', servidorId: 'A', uid: 'u1', rol: 'admin', grupo: 'G', unidoEn: '2026-01-05', correo: 'a@b.c',
    })
  })

  it('aPerfil y aPrevia sanean valores raros', () => {
    expect(aPerfil(snap('u1', { nombre: 'Ana', color: 'url(x)', estado: 'raro', fotoUrl: 'http://x' }))).toEqual({
      uid: 'u1', nombre: 'Ana', usuario: '', iniciales: '?', color: '#6366f1', estado: 'desconectado', estadoTexto: undefined,
    })
    expect(aPrevia({ servidorId: 'S', servidorNombre: 'N', servidorColor: 'rojo', invitaUid: 'u' })).toMatchObject({
      servidorId: 'S', nombre: 'N', color: '#6366f1', totalMiembros: 0, descripcion: '', propietarioUid: 'u',
    })
  })

  it('ordena canales: texto antes que voz, general primero y luego por nombre', () => {
    const c = (nombre: string, tipo: 'texto' | 'voz') => aCanal(snap(nombre, { servidorId: 'A', nombre, tipo }), 'A')
    const orden = ordenarCanales([c('Sala', 'voz'), c('zeta', 'texto'), c('general', 'texto'), c('alfa', 'texto'), c('General', 'voz')])
    expect(orden.map((x) => x.nombre)).toEqual(['general', 'alfa', 'zeta', 'General', 'Sala'])
  })
})
