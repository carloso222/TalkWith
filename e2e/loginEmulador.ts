// Solo para el smoke: inicia sesión en el emulador de Auth con una credencial de Google simulada.
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from '../src/lib/firebase'

export async function entrar(sub: string, correo: string, nombre: string): Promise<string> {
  const token = JSON.stringify({ sub, email: correo, email_verified: true, name: nombre })
  const r = await signInWithCredential(auth, GoogleAuthProvider.credential(token))
  return r.user.uid
}
