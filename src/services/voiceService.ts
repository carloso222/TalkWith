/**
 * Datos propios de la sala de voz. Es autosuficiente a propósito: no depende
 * de campos nuevos en mocks/data.ts, para no pisar el trabajo de otras ramas.
 * Si luego quieres moverlo a mocks/data.ts, solo cambia estas constantes.
 */
import { channelService } from './index'

export type Senal = 'buena' | 'media'

/** Sesión en curso (con subtítulos en vivo) de cada canal de voz. */
const SESION_EN_VIVO: Record<string, string> = { 'sala-principal': 's1' }

/** Quién está silenciado dentro de una llamada. */
const SILENCIADOS: string[] = ['u-diego']

export const voiceService = {
  /** Sesión en curso del canal de voz (la que genera subtítulos), si existe. */
  liveSessionId: (canalId: string): string | undefined => SESION_EN_VIVO[canalId],
  /** Personas en la llamada, incluyendo al usuario actual aunque el mock no lo liste. */
  participants: (canalId: string, yoUid: string): string[] => {
    const ids = channelService.inCall(canalId)
    return !yoUid || ids.includes(yoUid) ? ids : [...ids, yoUid]
  },
  isMuted: (uid: string): boolean => SILENCIADOS.includes(uid),
  /** Calidad de conexión simulada (Diego sale con señal media, como en Figma). */
  signal: (uid: string): Senal => (uid === 'u-diego' ? 'media' : 'buena'),
}