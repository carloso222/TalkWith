import type { FirebaseOptions } from 'firebase/app'

export interface ConfigFirebase {
  opciones: FirebaseOptions
  usarEmuladores: boolean
}

/**
 * Lee la configuración de Firebase desde las variables de entorno.
 * Sin variables y fuera de producción se usan los emuladores (proyecto `demo-talkwith`);
 * en producción, si falta la configuración, falla en voz alta para no caer al emulador.
 */
export function leerConfigFirebase(env: ImportMetaEnv): ConfigFirebase {
  const usarEmuladores = env.VITE_USE_EMULATORS === 'true' || (!env.VITE_FIREBASE_API_KEY && !env.PROD)
  if (env.PROD && !env.VITE_FIREBASE_API_KEY) throw new Error('Falta la configuración de Firebase')

  const opciones: FirebaseOptions = {
    apiKey: env.VITE_FIREBASE_API_KEY || (usarEmuladores ? 'demo-key' : undefined),
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID || (usarEmuladores ? 'demo-talkwith' : undefined),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  return { opciones, usarEmuladores }
}
