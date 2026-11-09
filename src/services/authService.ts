import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { detenerEscuchas } from './firestore/escuchas'

/** Abre el popup de Google. */
export async function iniciarSesionConGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

/** Entra con correo y contraseña (Firebase guarda y cifra la contraseña, nosotros nunca). */
export async function iniciarSesionConCorreo(correo: string, contrasena: string): Promise<void> {
  await signInWithEmailAndPassword(auth, correo.trim(), contrasena)
}

/**
 * Crea la cuenta con correo y contraseña y manda el correo de verificación.
 * El perfil (nombre y usuario) se completa después en la pantalla de Registro.
 */
export async function crearCuentaConCorreo(correo: string, contrasena: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, correo.trim(), contrasena)
  // si falla el envío no bloqueamos el alta; se puede volver a pedir más adelante
  await sendEmailVerification(user).catch(() => undefined)
}

/**
 * Manda el enlace para restablecer la contraseña. Si el correo no tiene cuenta no avisamos,
 * para no revelar qué correos están registrados.
 */
export async function restablecerContrasena(correo: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, correo.trim())
  } catch (e) {
    if ((e as { code?: string } | null)?.code !== 'auth/user-not-found') throw e
  }
}

/** true si la sesión actual entró con Google (para los textos de la pantalla de Registro). */
export function sesionConGoogle(): boolean {
  return auth.currentUser?.providerData.some((p) => p.providerId === 'google.com') ?? false
}

/** Cancela las escuchas de Firestore antes de salir, para no recibir errores de permiso al perder la sesión. */
export function cerrarSesion(): Promise<void> {
  detenerEscuchas()
  return signOut(auth)
}

/** Avisa cada vez que cambia la sesión (también al cargar la página). */
export function escucharSesion(cb: (usuario: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb)
}

/** Texto para mostrar al usuario, o null si no hay que mostrar nada (canceló el popup). */
export function mensajeErrorAuth(e: unknown): string | null {
  const codigo = (e as { code?: string } | null)?.code
  switch (codigo) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/popup-blocked':
      return 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.'
    case 'auth/network-request-failed':
      return 'No pudimos conectar con el servicio de acceso. Revisa tu conexión.'
    // mismo mensaje para los tres casos, así no se sabe si el correo existe
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.'
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta. Inicia sesión o restablece tu contraseña.'
    case 'auth/invalid-email':
      return 'Ese correo no es válido.'
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    case 'auth/operation-not-allowed':
      return 'El acceso con correo no está activado todavía. Usa Google por ahora.'
    default:
      return 'No pudimos iniciar sesión. Intenta de nuevo.'
  }
}
