/**
 * Datos de ejemplo ("hard codeados"). Son los mismos nombres y textos que
 * aparecen en los mockups de Figma, para que las capturas coincidan.
 * Nadie debe llamar a una API en esta entrega: todo sale de aquí.
 */
import type {
  Actividad,
  Canal,
  Consentimiento,
  Grabacion,
  Mensaje,
  Miembro,
  ResultadoBusqueda,
  SesionVoz,
  Segmento,
  Servidor,
  Usuario,
} from '../types'

export const CURRENT_UID = 'u-carlos'

export const usuarios: Usuario[] = [
  { uid: 'u-carlos', nombre: 'Carlos Méndez', usuario: 'carlos.mendez', correo: 'carlos.mendez@gmail.com', iniciales: 'CM', color: '#c4b5fd', estado: 'en-linea' },
  { uid: 'u-sofia', nombre: 'Sofía Ramírez', usuario: 'sofia.ramirez', correo: 'sofia.ramirez@gmail.com', iniciales: 'SR', color: '#f9a8d4', estado: 'en-linea', estadoTexto: 'En Sala principal' },
  { uid: 'u-mateo', nombre: 'Mateo Herrera', usuario: 'mateo.herrera', correo: 'mateo.herrera@gmail.com', iniciales: 'MH', color: '#fdba74', estado: 'en-linea', estadoTexto: 'En Sala principal' },
  { uid: 'u-diego', nombre: 'Diego Torres', usuario: 'diego.torres', correo: 'diego.torres@gmail.com', iniciales: 'DT', color: '#fcd34d', estado: 'en-linea', estadoTexto: 'En Sala principal' },
  { uid: 'u-isaian', nombre: 'Isaian Ayala', usuario: 'isaian.ayala', correo: 'isaian.ayala@gmail.com', iniciales: 'IA', color: '#67e8f9', estado: 'en-linea', estadoTexto: 'Escribiendo…' },
  { uid: 'u-lucia', nombre: 'Lucía Navarro', usuario: 'lucia.navarro', correo: 'lucia.navarro@gmail.com', iniciales: 'LN', color: '#a5b4fc', estado: 'en-linea', estadoTexto: 'Revisando entregas' },
  { uid: 'u-valeria', nombre: 'Valeria Cruz', usuario: 'valeria.cruz', correo: 'valeria.cruz@gmail.com', iniciales: 'VC', color: '#86efac', estado: 'desconectado', estadoTexto: 'Hace 20 min' },
  { uid: 'u-andres', nombre: 'Andrés Lozano', usuario: 'andres.lozano', correo: 'andres.lozano@gmail.com', iniciales: 'AL', color: '#fca5a5', estado: 'desconectado', estadoTexto: 'Ayer' },
]

export const servidores: Servidor[] = [
  { servidorId: 'estudio-diseno', nombre: 'Estudio de Diseño', descripcion: 'Espacio del grupo de Diseño de Información: entregas, críticas y avisos.', iniciales: 'ED', color: '#6366f1', propietarioUid: 'u-carlos', privacidad: 'invitacion', totalMiembros: 18 },
  { servidorId: 'club-lectura', nombre: 'Club de Lectura', descripcion: 'Un libro al mes y charlas de voz los viernes por la noche.', iniciales: 'CL', color: '#ec4899', propietarioUid: 'u-sofia', privacidad: 'enlace', totalMiembros: 24 },
  { servidorId: 'dev-latam', nombre: 'Dev Latam', descripcion: 'Comunidad de desarrollo en español: dudas, empleos y pair programming.', iniciales: 'DL', color: '#16a34a', propietarioUid: 'u-diego', privacidad: 'enlace', totalMiembros: 312 },
  { servidorId: 'foto-musica', nombre: 'Foto y Música', descripcion: 'Comparte fotos, playlists y sesiones de escucha en grupo.', iniciales: 'FM', color: '#d97706', propietarioUid: 'u-mateo', privacidad: 'invitacion', totalMiembros: 46 },
]

export const miembros: Miembro[] = [
  { miembroId: 'm1', servidorId: 'estudio-diseno', uid: 'u-carlos', rol: 'propietario', grupo: 'Estudiantes', unidoEn: '2026-09-02' },
  { miembroId: 'm2', servidorId: 'estudio-diseno', uid: 'u-lucia', rol: 'admin', grupo: 'Coordinación', unidoEn: '2026-09-02' },
  { miembroId: 'm3', servidorId: 'estudio-diseno', uid: 'u-sofia', rol: 'miembro', grupo: 'Estudiantes', unidoEn: '2026-09-03' },
  { miembroId: 'm4', servidorId: 'estudio-diseno', uid: 'u-mateo', rol: 'miembro', grupo: 'Estudiantes', unidoEn: '2026-09-03' },
  { miembroId: 'm5', servidorId: 'estudio-diseno', uid: 'u-diego', rol: 'miembro', grupo: 'Estudiantes', unidoEn: '2026-09-04' },
  { miembroId: 'm6', servidorId: 'estudio-diseno', uid: 'u-isaian', rol: 'miembro', grupo: 'Estudiantes', unidoEn: '2026-09-04' },
  { miembroId: 'm7', servidorId: 'estudio-diseno', uid: 'u-valeria', rol: 'miembro', grupo: 'Estudiantes', unidoEn: '2026-09-05' },
  { miembroId: 'm8', servidorId: 'estudio-diseno', uid: 'u-andres', rol: 'miembro', grupo: 'Estudiantes', unidoEn: '2026-09-10' },
  { miembroId: 'm9', servidorId: 'club-lectura', uid: 'u-carlos', rol: 'miembro', unidoEn: '2026-09-12' },
  { miembroId: 'm10', servidorId: 'dev-latam', uid: 'u-carlos', rol: 'admin', unidoEn: '2026-08-20' },
  { miembroId: 'm11', servidorId: 'foto-musica', uid: 'u-carlos', rol: 'miembro', unidoEn: '2026-09-15' },
]

export const canales: Canal[] = [
  { canalId: 'general', servidorId: 'estudio-diseno', nombre: 'general', tipo: 'texto', descripcion: 'Conversación diaria del estudio y avisos rápidos' },
  { canalId: 'recursos', servidorId: 'estudio-diseno', nombre: 'recursos', tipo: 'texto', descripcion: 'Referencias, plantillas y lecturas' },
  { canalId: 'entregas', servidorId: 'estudio-diseno', nombre: 'entregas', tipo: 'texto', descripcion: 'Avances y entregas de cada semana', menciones: 1 },
  { canalId: 'anuncios', servidorId: 'estudio-diseno', nombre: 'anuncios', tipo: 'texto', descripcion: 'Solo coordinación publica aquí', privado: true },
  { canalId: 'sala-principal', servidorId: 'estudio-diseno', nombre: 'Sala principal', tipo: 'voz' },
  { canalId: 'critica-portafolio', servidorId: 'estudio-diseno', nombre: 'Crítica de portafolio', tipo: 'voz' },
  { canalId: 'cabina-silenciosa', servidorId: 'estudio-diseno', nombre: 'Cabina silenciosa', tipo: 'voz' },
  { canalId: 'lectura-general', servidorId: 'club-lectura', nombre: 'general', tipo: 'texto', descripcion: 'Charla del libro del mes' },
  { canalId: 'lectura-viernes', servidorId: 'club-lectura', nombre: 'Charla de viernes', tipo: 'voz' },
  { canalId: 'dev-general', servidorId: 'dev-latam', nombre: 'general', tipo: 'texto', descripcion: 'Dudas y avisos de la comunidad' },
  { canalId: 'dev-pair', servidorId: 'dev-latam', nombre: 'Pair programming', tipo: 'voz' },
  { canalId: 'foto-general', servidorId: 'foto-musica', nombre: 'general', tipo: 'texto', descripcion: 'Fotos y playlists' },
  { canalId: 'foto-escucha', servidorId: 'foto-musica', nombre: 'Sala de escucha', tipo: 'voz' },
]

/** Quién está conectado en cada canal de voz (presencia simulada). */
export const enLlamada: Record<string, string[]> = {
  'sala-principal': ['u-sofia', 'u-mateo', 'u-diego'],
}

/** Quién está silenciado dentro de una llamada. */
export const silenciados: string[] = ['u-diego']

/** Sesión en curso (con subtítulos en vivo) de cada canal de voz. */
export const sesionEnVivo: Record<string, string> = { 'sala-principal': 's1' }

/** Canales de texto cuyas menciones ya estaban leídas al iniciar. */
export const canalesLeidos: string[] = ['general']

export const mensajes: Mensaje[] = [
  { mensajeId: 'msg1', canalId: 'general', autorUid: 'u-sofia', creadoEn: '10:42', contenido: 'Subí la nueva versión del flujo de onboarding. ¿Alguien la revisa antes de la crítica?', adjunto: { tipo: 'archivo', titulo: 'onboarding-v3.fig', detalle: 'Archivo de Figma, 4.2 MB' } },
  { mensajeId: 'msg2', canalId: 'general', autorUid: 'u-diego', creadoEn: '10:47', contenido: 'Yo la reviso. ¿La sección de permisos ya tiene el texto final?' },
  { mensajeId: 'msg3', canalId: 'general', autorUid: 'u-diego', creadoEn: '10:48', contenido: 'Lo pregunto por el texto del diálogo del micrófono.' },
  { mensajeId: 'msg4', canalId: 'general', autorUid: 'u-mateo', creadoEn: '11:20', contenido: 'Les dejo esta referencia para la crítica de hoy.', adjunto: { tipo: 'enlace', titulo: 'Diez heurísticas de usabilidad para el diseño de interfaces', detalle: 'Principios generales para evaluar la interacción entre personas y sistemas.', url: 'nngroup.com' } },
  { mensajeId: 'msg5', canalId: 'general', autorUid: 'u-valeria', creadoEn: '11:58', contenido: 'Yo llevo la rúbrica impresa.' },
  { mensajeId: 'msg6', canalId: 'general', autorUid: 'u-valeria', creadoEn: '11:59', contenido: 'Y reservé Sala principal de 4 a 5 para que nadie se quede fuera.' },
  { mensajeId: 'msg7', canalId: 'general', autorUid: 'u-isaian', creadoEn: '12:10', contenido: '@Carlos ya está la grabación de ayer en el historial, por si quieres revisar los comentarios de Lucía.', menciones: ['u-carlos'] },
  { mensajeId: 'msg8', canalId: 'entregas', autorUid: 'u-diego', creadoEn: '11:50', contenido: '@Carlos ¿puedes revisar el avance de la entrega 3 antes de las 4?', menciones: ['u-carlos'] },
]

export const sesiones: SesionVoz[] = [
  { sesionId: 's1', servidorId: 'estudio-diseno', canalId: 'sala-principal', inicio: 'Hoy, 16:20', duracion: '00:24:18', participantes: ['u-sofia', 'u-mateo', 'u-diego', 'u-carlos'], totalSegmentos: 142, grabacion: 'grabada' },
  { sesionId: 's2', servidorId: 'estudio-diseno', canalId: 'critica-portafolio', inicio: 'Ayer, 18:30', duracion: '01:12:05', participantes: ['u-mateo', 'u-valeria', 'u-lucia', 'u-sofia', 'u-diego'], totalSegmentos: 388, grabacion: 'grabada' },
  { sesionId: 's3', servidorId: 'estudio-diseno', canalId: 'sala-principal', inicio: '29 sep, 10:00', duracion: '00:45:51', participantes: ['u-sofia', 'u-diego'], totalSegmentos: 201, grabacion: 'sin-grabacion' },
  { sesionId: 's4', servidorId: 'estudio-diseno', canalId: 'cabina-silenciosa', inicio: '27 sep, 21:15', duracion: '00:08:12', participantes: ['u-isaian', 'u-carlos'], totalSegmentos: 37, grabacion: 'sin-grabacion' },
  { sesionId: 's5', servidorId: 'estudio-diseno', canalId: 'critica-portafolio', inicio: '25 sep, 17:00', duracion: '00:58:40', participantes: ['u-lucia', 'u-sofia', 'u-mateo', 'u-valeria'], totalSegmentos: 305, grabacion: 'grabada' },
  { sesionId: 's6', servidorId: 'estudio-diseno', canalId: 'sala-principal', inicio: '24 sep, 09:30', duracion: '00:31:07', participantes: ['u-diego', 'u-mateo', 'u-carlos'], totalSegmentos: 164, grabacion: 'procesando' },
]

export const segmentos: Segmento[] = [
  { segmentoId: 'g1', sesionId: 's1', hablanteUid: 'u-carlos', marcaTiempo: '16:21:04', texto: 'Empecemos con el flujo de permisos, que es lo que más dudas generó en la prueba.' },
  { segmentoId: 'g2', sesionId: 's1', hablanteUid: 'u-diego', marcaTiempo: '16:21:40', texto: 'Yo noté que el diálogo del navegador aparece antes de explicar para qué es el micrófono.' },
  { segmentoId: 'g3', sesionId: 's1', hablanteUid: 'u-mateo', marcaTiempo: '16:22:15', texto: 'De acuerdo, y que diga qué pasa si alguien lo rechaza.' },
  { segmentoId: 'g4', sesionId: 's1', hablanteUid: 'u-sofia', marcaTiempo: '16:22:48', texto: 'Creo que el flujo de permisos debería explicar por qué pedimos el micrófono antes de mostrar el diálogo del navegador.' },
]

export const grabaciones: Grabacion[] = [
  { grabacionId: 'r1', sesionId: 's1', servidorId: 'estudio-diseno', titulo: 'Revisión del flujo de permisos', canalNombre: 'Sala principal', fecha: 'Hoy, 16:20', duracion: '24:18', creadorUid: 'u-carlos', tamano: '23.1 MB', aceptaron: 4, participantes: 4 },
  { grabacionId: 'r2', sesionId: 's2', servidorId: 'estudio-diseno', titulo: 'Crítica de portafolios — semana 6', canalNombre: 'Crítica de portafolio', fecha: 'Ayer, 18:30', duracion: '1:12:05', creadorUid: 'u-mateo', tamano: '68.4 MB', aceptaron: 5, participantes: 5 },
  { grabacionId: 'r3', sesionId: 's5', servidorId: 'estudio-diseno', titulo: 'Ensayo de la presentación final', canalNombre: 'Sala principal', fecha: '25 sep, 17:00', duracion: '58:40', creadorUid: 'u-sofia', tamano: '55.2 MB', aceptaron: 4, participantes: 4 },
  { grabacionId: 'r4', sesionId: 's6', servidorId: 'estudio-diseno', titulo: 'Planeación del sprint 3', canalNombre: 'Sala principal', fecha: '22 sep, 11:00', duracion: '41:12', creadorUid: 'u-diego', tamano: '38.9 MB', aceptaron: 3, participantes: 3 },
  { grabacionId: 'r5', sesionId: 's4', servidorId: 'estudio-diseno', titulo: 'Lluvia de ideas del logo', canalNombre: 'Cabina silenciosa', fecha: '19 sep, 20:10', duracion: '15:36', creadorUid: 'u-isaian', tamano: '14.7 MB', aceptaron: 2, participantes: 2 },
]

export const consentimientos: Consentimiento[] = [
  { sesionId: 's1', uid: 'u-carlos', estado: 'aceptado' },
  { sesionId: 's1', uid: 'u-sofia', estado: 'aceptado' },
  { sesionId: 's1', uid: 'u-diego', estado: 'rechazado' },
  { sesionId: 's1', uid: 'u-mateo', estado: 'pendiente' },
]

export const actividad: Actividad[] = [
  { actividadId: 'a1', tipo: 'mencion', texto: 'Diego te mencionó en #entregas', cuando: 'Hace 12 min', ruta: '/app/s/estudio-diseno/c/entregas' },
  { actividadId: 'a2', tipo: 'transcripcion', texto: 'Nueva transcripción de Crítica de portafolio, 48 min', cuando: 'Ayer, 18:30', ruta: '/app/s/estudio-diseno/sesiones/s2' },
  { actividadId: 'a3', tipo: 'archivo', texto: 'Valeria subió rubrica-final.pdf en #recursos', cuando: 'Ayer, 16:05', ruta: '/app/s/estudio-diseno/c/recursos' },
]

export const resultadosBusqueda: ResultadoBusqueda[] = [
  { resultadoId: 'b1', tipo: 'mensaje', servidorNombre: 'Estudio de Diseño', ubicacion: '#general', autorUid: 'u-diego', fragmento: 'Yo la reviso. ¿La sección de permisos ya tiene el texto final? Lo pregunto por el diálogo del micrófono.', cuando: 'Hoy, 10:47', ruta: '/app/s/estudio-diseno/c/general' },
  { resultadoId: 'b2', tipo: 'transcripcion', servidorNombre: 'Estudio de Diseño', ubicacion: 'Sala principal', autorUid: 'u-sofia', fragmento: 'Creo que el flujo de permisos debería explicar por qué pedimos el micrófono.', cuando: 'Hoy, 16:22', ruta: '/app/s/estudio-diseno/sesiones/s1' },
  { resultadoId: 'b3', tipo: 'transcripcion', servidorNombre: 'Estudio de Diseño', ubicacion: 'Sala principal', autorUid: 'u-carlos', fragmento: 'Empecemos con el flujo de permisos, que es lo que más dudas generó.', cuando: 'Hoy, 16:21', ruta: '/app/s/estudio-diseno/sesiones/s1' },
  { resultadoId: 'b4', tipo: 'mensaje', servidorNombre: 'Estudio de Diseño', ubicacion: '#entregas', autorUid: 'u-lucia', fragmento: 'Recuerden justificar en la entrega por qué piden permisos de micrófono.', cuando: '29 sep', ruta: '/app/s/estudio-diseno/c/entregas' },
]
