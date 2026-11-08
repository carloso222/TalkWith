import type { Unsubscribe } from 'firebase/auth'
import { asegurarPerfil } from '../services/perfilService'
import { cerrarSesion, escucharSesion } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { useVoiceStore } from '../store/voiceStore'

/** Clave que usaba la sesión simulada; se borra por si quedó de una versión anterior. */
const CLAVE_SESION_ANTIGUA = 'talkwith-auth'

/** Deja la app sin rastro de la sesión anterior. En la Fase 2 aquí se detienen las escuchas de Firestore. */
export function limpiarEstadoLocal(): void {
  useAuthStore.getState().limpiar()
  useVoiceStore.setState(useVoiceStore.getInitialState(), true)
  sessionStorage.removeItem(CLAVE_SESION_ANTIGUA)
}

/** Une Firebase Auth con los stores. Se llama una sola vez desde `main.tsx`. */
export function iniciarEscuchaSesion(): Unsubscribe {
  return escucharSesion(async (user) => {
    if (!user) {
      limpiarEstadoLocal()
      return
    }
    try {
      const { usuario, perfilCompleto } = await asegurarPerfil(user)
      useAuthStore.getState().setSesion(usuario, perfilCompleto)
    } catch (error) {
      console.error(error)
      useUiStore.getState().notify('error', 'No pudimos cargar tu perfil', 'Cerramos tu sesión. Intenta entrar de nuevo.')
      await cerrarSesion()
    }
  })
}
