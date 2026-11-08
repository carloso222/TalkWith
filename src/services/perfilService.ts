import type { User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Usuario } from '../types'
import { ApiError } from './errores'

// mismos colores de avatar que usan los servidores
const COLORES = ['#6366f1', '#ec4899', '#16a34a', '#d97706', '#0ea5e9', '#8b5cf6', '#ef4444']

function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return '?'
  const letras = palabras.length > 1 ? palabras[0][0] + palabras[1][0] : palabras[0].slice(0, 2)
  return letras.toUpperCase()
}

function colorPara(uid: string): string {
  const suma = [...uid].reduce((total, c) => total + c.charCodeAt(0), 0)
  return COLORES[suma % COLORES.length]
}

/** El correo viene de la cuenta de Google y nunca se escribe en Firestore. */
function aUsuario(uid: string, correo: string, datos: Record<string, unknown>): Usuario {
  return {
    uid,
    nombre: String(datos.nombre ?? ''),
    usuario: typeof datos.usuario === 'string' ? datos.usuario : '',
    correo,
    iniciales: String(datos.iniciales ?? '?'),
    color: String(datos.color ?? colorPara(uid)),
    fotoUrl: typeof datos.fotoUrl === 'string' ? datos.fotoUrl : undefined,
    estado: 'en-linea',
    estadoTexto: typeof datos.estadoTexto === 'string' ? datos.estadoTexto : undefined,
  }
}

/** Crea `usuarios/{uid}` en el primer login; en los siguientes solo actualiza foto y fecha. */
export async function asegurarPerfil(user: User): Promise<{ usuario: Usuario; perfilCompleto: boolean }> {
  const ref = doc(db, 'usuarios', user.uid)
  const existente = await getDoc(ref)
  const correo = user.email ?? ''
  if (existente.exists()) {
    const foto = user.photoURL ? { fotoUrl: user.photoURL } : {}
    await setDoc(ref, { ...foto, actualizadoEn: serverTimestamp() }, { merge: true })
    const datos = existente.data()
    return { usuario: aUsuario(user.uid, correo, { ...datos, ...foto }), perfilCompleto: Boolean(datos.usuario) }
  }
  const nombre = user.displayName?.trim() || correo.split('@')[0] || 'Usuario'
  const nuevo: Record<string, unknown> = {
    nombre,
    iniciales: iniciales(nombre),
    color: colorPara(user.uid),
    estado: 'en-linea',
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  }
  if (user.photoURL) nuevo.fotoUrl = user.photoURL
  await setDoc(ref, nuevo)
  return { usuario: aUsuario(user.uid, correo, nuevo), perfilCompleto: false }
}

/** Reserva el nombre de usuario y completa el perfil en un solo batch. */
export async function completarRegistro(actual: Usuario, datos: { nombre: string; usuario: string }): Promise<Usuario> {
  const handle = datos.usuario.replace(/^@/, '').trim().toLowerCase()
  const nombre = datos.nombre.trim()
  const ocupado = new ApiError(409, 'Ese nombre de usuario ya está en uso.', 'usuario')
  const reserva = doc(db, 'nombresUsuario', handle)
  if ((await getDoc(reserva)).exists()) throw ocupado

  const batch = writeBatch(db)
  batch.set(reserva, { uid: actual.uid })
  batch.update(doc(db, 'usuarios', actual.uid), { nombre, usuario: handle, iniciales: iniciales(nombre), actualizadoEn: serverTimestamp() })
  try {
    await batch.commit()
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') throw ocupado
    throw e
  }
  return { ...actual, nombre, usuario: handle, iniciales: iniciales(nombre) }
}
