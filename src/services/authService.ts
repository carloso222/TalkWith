import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Unsubscribe, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

/** Abre el popup de Google. */
export async function iniciarSesionConGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export function cerrarSesion(): Promise<void> {
  return signOut(auth)
}

/** Avisa cada vez que cambia la sesión (también al cargar la página). */
export function escucharSesion(cb: (usuario: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb)
}

/** Texto para mostrar al usuario, o null si no hay que mostrar nada (canceló el popup). */
export function mensajeErrorAuth(e: unknown): string | null {
  const codigo = (e as { code?: string } | null)?.code
  if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return null
  if (codigo === 'auth/popup-blocked') return 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.'
  if (codigo === 'auth/network-request-failed') return 'No pudimos conectar con Google. Revisa tu conexión.'
  return 'No pudimos iniciar sesión. Intenta de nuevo.'
}
