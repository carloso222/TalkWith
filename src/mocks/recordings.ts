/**
 * Datos de ejemplo de la pantalla 21 «Grabaciones del servidor» (Figma).
 * Archivo propio para no pisar mocks/data.ts, que tocan varias ramas.
 */
export interface GrabacionItem {
  id: string
  titulo: string
  canalNombre: string
  fecha: string
  duracion: string
  creador: { nombre: string; iniciales: string; color: string }
  aceptaron: number
  participantes: number
  tamano: string
}

export interface ResumenGrabaciones {
  esteMes: number
  duracionTotal: string
  usadoMb: number
  limiteMb: number
}

export interface BibliotecaGrabaciones {
  resumen: ResumenGrabaciones
  items: GrabacionItem[]
}

/** Biblioteca por servidor. Los servidores que no aparecen aquí no tienen grabaciones. */
export const grabacionesPorServidor: Record<string, BibliotecaGrabaciones> = {
  'estudio-diseno': {
    resumen: { esteMes: 12, duracionTotal: '3 h 41 min', usadoMb: 412, limiteMb: 1024 },
    items: [
      { id: 'g1', titulo: 'Revisión del flujo de permisos', canalNombre: 'Sala principal', fecha: 'Hoy, 16:20', duracion: '24:18', creador: { nombre: 'Carlos Méndez', iniciales: 'CM', color: '#c4b5fd' }, aceptaron: 4, participantes: 4, tamano: '23.1 MB' },
      { id: 'g2', titulo: 'Crítica de portafolios — semana 6', canalNombre: 'Crítica de portafolio', fecha: 'Ayer, 18:30', duracion: '1:12:05', creador: { nombre: 'Mateo Herrera', iniciales: 'MH', color: '#fdba74' }, aceptaron: 5, participantes: 5, tamano: '68.4 MB' },
      { id: 'g3', titulo: 'Ensayo de la presentación final', canalNombre: 'Sala principal', fecha: '25 sep, 17:00', duracion: '58:40', creador: { nombre: 'Sofía Ramírez', iniciales: 'SR', color: '#f9a8d4' }, aceptaron: 4, participantes: 4, tamano: '55.2 MB' },
      { id: 'g4', titulo: 'Planeación del sprint 3', canalNombre: 'Sala principal', fecha: '22 sep, 11:00', duracion: '41:12', creador: { nombre: 'Diego Torres', iniciales: 'DT', color: '#fde047' }, aceptaron: 3, participantes: 3, tamano: '38.9 MB' },
      { id: 'g5', titulo: 'Lluvia de ideas del logo', canalNombre: 'Cabina silenciosa', fecha: '19 sep, 20:10', duracion: '15:36', creador: { nombre: 'Isaian Ayala', iniciales: 'IA', color: '#67e8f9' }, aceptaron: 2, participantes: 2, tamano: '14.7 MB' },
    ],
  },
}