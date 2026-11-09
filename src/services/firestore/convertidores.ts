import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'
import type { Canal, EstadoPresencia, Miembro, Rol, Servidor } from '../../types'
import type { DocServidor, PerfilDoc } from '../../store/datosStore'

/** Convierte documentos de Firestore a los tipos de la app. No escribe nada. */

type Instantanea = DocumentSnapshot | QueryDocumentSnapshot
type MarcaDeTiempo = { toDate: () => Date; toMillis: () => number }

const COLOR_POR_DEFECTO = '#6366f1'
const ROLES: Rol[] = ['propietario', 'admin', 'miembro']
const ESTADOS: EstadoPresencia[] = ['en-linea', 'ausente', 'desconectado']

/** Datos del documento; las marcas de tiempo pendientes se estiman con la hora local. */
export const datosDe = (snap: Instantanea): DocumentData => snap.data({ serverTimestamps: 'estimate' }) ?? {}

/** Solo acepta colores hexadecimales, porque el valor termina en un estilo. */
export function colorSeguro(color: unknown): string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : COLOR_POR_DEFECTO
}

const texto = (valor: unknown, defecto = ''): string => (typeof valor === 'string' ? valor : defecto)

const esMarca = (valor: unknown): valor is MarcaDeTiempo =>
  typeof valor === 'object' && valor !== null && typeof (valor as MarcaDeTiempo).toDate === 'function'

/** Timestamp → 'YYYY-MM-DD' (o '' si no es una marca de tiempo). */
export function fecha(valor: unknown): string {
  return esMarca(valor) ? valor.toDate().toISOString().slice(0, 10) : ''
}

/** Timestamp de vencimiento → '7 días', '1 día', '5 h' o 'menos de 1 h'. */
export function expiraEn(valor: unknown, ahora: number = Date.now()): string {
  if (!esMarca(valor)) return ''
  const horas = Math.ceil((valor.toMillis() - ahora) / 3_600_000)
  if (horas <= 0) return 'vencida'
  if (horas < 24) return `${horas} h`
  const dias = Math.ceil(horas / 24)
  return dias === 1 ? '1 día' : `${dias} días`
}

export function aServidor(snap: Instantanea): DocServidor {
  const d = datosDe(snap)
  return {
    servidorId: snap.id,
    nombre: texto(d.nombre),
    descripcion: texto(d.descripcion),
    iniciales: texto(d.iniciales, '?'),
    color: colorSeguro(d.color),
    propietarioUid: texto(d.propietarioUid),
    privacidad: d.privacidad === 'enlace' ? 'enlace' : 'invitacion',
  }
}

/** Devuelve null si el rol no es uno de los tres válidos. */
export function aMiembro(snap: Instantanea, servidorId: string): Miembro | null {
  const d = datosDe(snap)
  if (!ROLES.includes(d.rol)) return null
  return {
    miembroId: snap.id,
    servidorId,
    uid: snap.id,
    rol: d.rol,
    grupo: typeof d.grupo === 'string' ? d.grupo : undefined,
    unidoEn: fecha(d.unidoEn),
    correo: typeof d.correo === 'string' ? d.correo : undefined,
  }
}

export function aCanal(snap: Instantanea, servidorId: string): Canal {
  const d = datosDe(snap)
  return {
    canalId: snap.id,
    servidorId,
    nombre: texto(d.nombre),
    tipo: d.tipo === 'voz' ? 'voz' : 'texto',
    descripcion: typeof d.descripcion === 'string' && d.descripcion ? d.descripcion : undefined,
    privado: typeof d.privado === 'boolean' ? d.privado : undefined,
  }
}

/** Texto antes que voz; dentro de cada tipo, «general» primero y luego por nombre. */
export function ordenarCanales(canales: Canal[]): Canal[] {
  const peso = (c: Canal) => (c.tipo === 'texto' ? 0 : 2) + (c.nombre === 'general' ? 0 : 1)
  return [...canales].sort((a, b) => peso(a) - peso(b) || a.nombre.localeCompare(b.nombre, 'es'))
}

export function aPerfil(snap: Instantanea): PerfilDoc {
  const d = datosDe(snap)
  return {
    uid: snap.id,
    nombre: texto(d.nombre),
    usuario: texto(d.usuario),
    iniciales: texto(d.iniciales, '?'),
    color: colorSeguro(d.color),
    estado: ESTADOS.includes(d.estado) ? d.estado : 'desconectado',
    estadoTexto: typeof d.estadoTexto === 'string' ? d.estadoTexto : undefined,
  }
}

/** Vista previa de un servidor a partir de una invitación (no puede contar miembros). */
export function aPrevia(d: DocumentData): Servidor {
  return {
    servidorId: texto(d.servidorId),
    nombre: texto(d.servidorNombre),
    descripcion: '',
    iniciales: texto(d.servidorIniciales, '?'),
    color: colorSeguro(d.servidorColor),
    propietarioUid: texto(d.invitaUid),
    privacidad: 'invitacion',
    totalMiembros: 0,
  }
}
