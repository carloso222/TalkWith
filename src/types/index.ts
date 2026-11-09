/**
 * Modelo de datos de TalkWith (sección 4.1 del documento de planeación).
 * En esta entrega todo sale de /mocks; en la siguiente, los servicios
 * leerán lo mismo desde Firebase y Socket.io sin tocar las vistas.
 */

export type Rol = 'propietario' | 'admin' | 'miembro'
export type EstadoPresencia = 'en-linea' | 'ausente' | 'desconectado'
export type TipoCanal = 'texto' | 'voz'
export type EstadoConsentimiento = 'pendiente' | 'aceptado' | 'rechazado'

export interface Usuario {
  uid: string
  nombre: string
  usuario: string
  correo: string
  iniciales: string
  /** Color del avatar cuando no hay foto (igual que en el Figma). */
  color: string
  fotoUrl?: string
  estado: EstadoPresencia
  /** Texto de estado personalizado, p. ej. "Revisando entregas". */
  estadoTexto?: string
}

export interface Servidor {
  servidorId: string
  nombre: string
  descripcion: string
  iniciales: string
  color: string
  propietarioUid: string
  privacidad: 'invitacion' | 'enlace'
  totalMiembros: number
}

export interface Miembro {
  miembroId: string
  servidorId: string
  uid: string
  rol: Rol
  /** Grupo con que se muestra en la columna de miembros. */
  grupo?: string
  unidoEn: string
  /** Correo de la cuenta; solo lo guarda la membresía en Firestore. */
  correo?: string
}

export interface Canal {
  canalId: string
  servidorId: string
  nombre: string
  tipo: TipoCanal
  descripcion?: string
  privado?: boolean
  menciones?: number
}

export interface Adjunto {
  tipo: 'archivo' | 'enlace'
  titulo: string
  detalle: string
  url?: string
}

export interface Mensaje {
  mensajeId: string
  canalId: string
  autorUid: string
  contenido: string
  /** Hora para mostrar, p. ej. "16:20". */
  creadoEn: string
  /** Momento exacto en milisegundos (ordena el historial y separa por día). */
  creadoMs?: number
  adjunto?: Adjunto
  /** UIDs mencionados con @ dentro del contenido. */
  menciones?: string[]
}

export interface SesionVoz {
  sesionId: string
  servidorId: string
  canalId: string
  inicio: string
  duracion: string
  participantes: string[]
  totalSegmentos: number
  grabacion: 'grabada' | 'procesando' | 'sin-grabacion'
}

/** Persona dentro de una sala de voz, tal como la manda el servidor de Socket.io. */
export interface ParticipanteLlamada {
  uid: string
  silenciado: boolean
  hablando: boolean
  /** Perdió la conexión y el servidor le guarda el lugar unos segundos. */
  reconectando: boolean
  /** Cambia cada vez que la persona entra a la sala; sirve para rehacer el audio (WebRTC). */
  conexion: number
}

export interface Segmento {
  segmentoId: string
  sesionId: string
  hablanteUid: string
  texto: string
  marcaTiempo: string
}

export interface Grabacion {
  grabacionId: string
  sesionId: string
  servidorId: string
  titulo: string
  canalNombre: string
  fecha: string
  duracion: string
  creadorUid: string
  tamano: string
  aceptaron: number
  participantes: number
}

export interface Consentimiento {
  sesionId: string
  uid: string
  estado: EstadoConsentimiento
}

export interface Actividad {
  actividadId: string
  tipo: 'mencion' | 'transcripcion' | 'archivo'
  texto: string
  cuando: string
  ruta: string
}

export interface ResultadoBusqueda {
  resultadoId: string
  tipo: 'mensaje' | 'transcripcion'
  servidorNombre: string
  ubicacion: string
  autorUid: string
  fragmento: string
  cuando: string
  ruta: string
}

export type TipoToast = 'exito' | 'info' | 'error'

export interface Toast {
  id: string
  tipo: TipoToast
  titulo: string
  descripcion?: string
}

export interface ResumenInicio {
  llamada: {
    servidorId: string
    canalId: string
    canalNombre: string
    participantes: string[]
    subtitulo?: { hablanteUid: string; texto: string }
  } | null
  sesionesNuevas: number
  /** Servidor por defecto del usuario (el primero al que pertenece). */
  servidorId: string
}
/** Datos de la tarjeta de cada servidor en «Tus servidores». */
export interface ResumenServidor {
  canales: number
  enLlamada: number
  /** Última actividad cuando nadie está en llamada, p. ej. "Activo hace 2 h". */
  actividad?: string
}

/** Invitación a un servidor (enlace talkwith.app/i/<codigo>). */
export interface Invitacion {
  codigo: string
  servidorId: string
  invitaUid: string
  expiraEn: string
  enLinea: number
  enLlamada: number
}
