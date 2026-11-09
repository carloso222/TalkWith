import type { TipoCanal } from '../types'

// reglas de validacion de los formularios

export const REGLAS = {
  canalNombreMin: 2,
  canalNombreMax: 30,
  canalDescripcionMax: 120,
  servidorNombreMin: 3,
  servidorNombreMax: 50,
  servidorDescripcionMax: 200,
  nombreMin: 2,
  nombreMax: 32,
  usuarioMin: 3,
  usuarioMax: 20,
}

// regresa true si algun campo tiene error
export function hayErrores(errores: Record<string, string | undefined>) {
  return Object.values(errores).some((e) => Boolean(e))
}

/* ---------- canales ---------- */

export interface DatosCanal {
  nombre: string
  tipo: TipoCanal
  descripcion: string
  privado: boolean
}

export function validarCanal(datos: DatosCanal, roles: string[] = []) {
  const errores: { nombre?: string; descripcion?: string; roles?: string } = {}
  const nombre = datos.nombre.trim()

  if (!nombre) errores.nombre = 'El canal necesita un nombre.'
  else if (nombre.length < REGLAS.canalNombreMin) errores.nombre = `Mínimo ${REGLAS.canalNombreMin} caracteres.`
  else if (nombre.length > REGLAS.canalNombreMax) errores.nombre = `Máximo ${REGLAS.canalNombreMax} caracteres.`
  else if (datos.tipo === 'texto' && !/^[a-z0-9-]+$/.test(nombre)) errores.nombre = 'Solo minúsculas, números y guiones.'
  else if (nombre.startsWith('-') || nombre.endsWith('-')) errores.nombre = 'No puede empezar ni terminar con guion.'

  if (datos.descripcion.trim().length > REGLAS.canalDescripcionMax) {
    errores.descripcion = `Máximo ${REGLAS.canalDescripcionMax} caracteres.`
  }

  if (datos.privado && roles.length === 0) errores.roles = 'Agrega al menos un rol que pueda entrar.'

  return errores
}

/* ---------- servidores ---------- */

export interface DatosServidor {
  nombre: string
  descripcion: string
  privacidad: 'invitacion' | 'enlace'
}

export function validarServidor(datos: DatosServidor) {
  const errores: { nombre?: string; descripcion?: string } = {}
  const nombre = datos.nombre.trim()

  if (!nombre) errores.nombre = 'El servidor necesita un nombre.'
  else if (nombre.length < REGLAS.servidorNombreMin) errores.nombre = `Mínimo ${REGLAS.servidorNombreMin} caracteres.`
  else if (nombre.length > REGLAS.servidorNombreMax) errores.nombre = `Máximo ${REGLAS.servidorNombreMax} caracteres.`

  if (datos.descripcion.trim().length > REGLAS.servidorDescripcionMax) {
    errores.descripcion = `Máximo ${REGLAS.servidorDescripcionMax} caracteres.`
  }

  return errores
}

/* ---------- registro ---------- */

export interface DatosRegistro {
  nombre: string
  usuario: string
  terminos: boolean
  grabacion: boolean
}

export function validarRegistro(datos: DatosRegistro) {
  const errores: { nombre?: string; usuario?: string; casillas?: string } = {}
  const nombre = datos.nombre.trim()
  const usuario = datos.usuario.replace(/^@/, '')

  if (nombre.length < REGLAS.nombreMin) errores.nombre = `Escribe cómo quieres que te vean (mínimo ${REGLAS.nombreMin} caracteres).`
  else if (nombre.length > REGLAS.nombreMax) errores.nombre = `Máximo ${REGLAS.nombreMax} caracteres.`

  if (!usuario) errores.usuario = 'Elige un nombre de usuario.'
  else if (!/^[a-z0-9.]+$/.test(usuario)) errores.usuario = 'Solo letras minúsculas, números y puntos.'
  else if (usuario.length < REGLAS.usuarioMin) errores.usuario = `Debe tener al menos ${REGLAS.usuarioMin} caracteres.`
  else if (usuario.length > REGLAS.usuarioMax) errores.usuario = `Máximo ${REGLAS.usuarioMax} caracteres.`

  if (!datos.terminos || !datos.grabacion) errores.casillas = 'Para continuar acepta ambas casillas.'

  return errores
}

/* ---------- acceso con correo ---------- */

export const REGLAS_ACCESO = {
  contrasenaMin: 8,
  contrasenaMax: 128,
}

export interface DatosAcceso {
  correo: string
  contrasena: string
  /** Solo al crear cuenta. */
  confirmar?: string
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** `crear` pide contraseña segura y confirmación; `entrar` solo que no estén vacías. */
export function validarAcceso(datos: DatosAcceso, modo: 'entrar' | 'crear') {
  const errores: { correo?: string; contrasena?: string; confirmar?: string } = {}
  const correo = datos.correo.trim()

  if (!correo) errores.correo = 'Escribe tu correo.'
  else if (!CORREO.test(correo)) errores.correo = 'Ese correo no es válido.'

  if (!datos.contrasena) errores.contrasena = 'Escribe tu contraseña.'
  else if (modo === 'crear') {
    if (datos.contrasena.length < REGLAS_ACCESO.contrasenaMin) errores.contrasena = `Mínimo ${REGLAS_ACCESO.contrasenaMin} caracteres.`
    else if (datos.contrasena.length > REGLAS_ACCESO.contrasenaMax) errores.contrasena = `Máximo ${REGLAS_ACCESO.contrasenaMax} caracteres.`
    else if (!/[a-zA-Z]/.test(datos.contrasena) || !/\d/.test(datos.contrasena)) errores.contrasena = 'Usa letras y números.'

    if (datos.confirmar !== datos.contrasena) errores.confirmar = 'Las contraseñas no coinciden.'
  }

  return errores
}
