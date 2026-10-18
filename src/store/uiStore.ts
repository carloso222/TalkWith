import { create } from 'zustand'
import type { Toast, TipoToast } from '../types'

/**
 * Estado global de la interfaz: notificaciones (toasts) y diálogos de confirmación.
 *
 * Uso desde cualquier componente:
 *   const notify = useUiStore((s) => s.notify)
 *   notify('exito', 'Servidor creado correctamente', 'Ya puedes invitar a tu equipo.')
 *
 *   const confirm = useUiStore((s) => s.confirm)
 *   const ok = await confirm({ titulo: '¿Eliminar la grabación?', ... })
 *   if (ok) notify('exito', 'Grabación eliminada')   // ¡pero no se borra nada!
 */
export interface ConfirmOptions {
  titulo: string
  descripcion: string
  confirmar?: string
  cancelar?: string
  peligro?: boolean
}

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

interface UiState {
  toasts: Toast[]
  notify: (tipo: TipoToast, titulo: string, descripcion?: string) => void
  dismiss: (id: string) => void
  dialogo: ConfirmState | null
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  cerrarDialogo: (ok: boolean) => void
}

const DURACION_TOAST_MS = 4500

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  notify: (tipo, titulo, descripcion) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tipo, titulo, descripcion }] }))
    setTimeout(() => get().dismiss(id), DURACION_TOAST_MS)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  dialogo: null,
  confirm: (opts) => new Promise<boolean>((resolve) => set({ dialogo: { ...opts, resolve } })),
  cerrarDialogo: (ok) => {
    get().dialogo?.resolve(ok)
    set({ dialogo: null })
  },
}))
