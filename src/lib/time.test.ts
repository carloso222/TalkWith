import { describe, expect, it } from 'vitest'
import { fechaSesion, formatear, horaTexto } from './time'

describe('fechas de sesiones', () => {
  const ahora = new Date(2026, 10, 9, 12, 0, 0)

  it('hoy, ayer y otros dias', () => {
    expect(fechaSesion(new Date(2026, 10, 9, 8, 5), ahora)).toBe('Hoy, 08:05')
    expect(fechaSesion(new Date(2026, 10, 8, 18, 30), ahora)).toBe('Ayer, 18:30')
    expect(fechaSesion(new Date(2026, 8, 29, 10, 0), ahora)).toBe('29 sep, 10:00')
  })

  it('ayer funciona en cambio de mes', () => {
    expect(fechaSesion(new Date(2026, 9, 31, 23, 59), new Date(2026, 10, 1, 9, 0))).toBe('Ayer, 23:59')
  })

  it('hora de un segmento y duracion', () => {
    expect(horaTexto(new Date(2026, 0, 1, 7, 3, 9))).toBe('07:03:09')
    expect(formatear(1458)).toBe('00:24:18')
  })
})
