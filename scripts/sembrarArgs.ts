export interface OpcionesSembrado {
  uid: string
  correo: string
  proyecto: string
}

const PROYECTO_POR_DEFECTO = 'demo-talkwith'

function valorDe(argv: string[], nombre: string): string | undefined {
  const prefijo = `--${nombre}=`
  return argv.find((a) => a.startsWith(prefijo))?.slice(prefijo.length)
}

/**
 * Lee y valida los argumentos del sembrado. Lanza un Error con el motivo si algo falta
 * o si el proyecto no es de demostración (así nunca apunta a producción).
 */
export function leerArgumentos(argv: string[], entorno: Record<string, string | undefined>): OpcionesSembrado {
  const uid = valorDe(argv, 'uid')?.trim()
  if (!uid) throw new Error('Falta --uid=<uid>. Copia tu uid desde http://127.0.0.1:4000/auth después de iniciar sesión.')
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('El uid solo puede tener letras, números, guion y guion bajo.')
  const proyecto = valorDe(argv, 'proyecto') ?? entorno.GCLOUD_PROJECT ?? PROYECTO_POR_DEFECTO
  if (!proyecto.startsWith('demo-')) {
    throw new Error(`El proyecto «${proyecto}» no empieza con «demo-»: el sembrado solo funciona con el emulador.`)
  }
  const correo = valorDe(argv, 'correo')?.trim() || `${uid}@demo.talkwith`
  return { uid, correo, proyecto }
}
