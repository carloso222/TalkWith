import { Timestamp } from 'firebase/firestore'
import { canales, CURRENT_UID, invitaciones, miembros, servidores, usuarios } from '../src/mocks/data.ts'

/** Documento de Firestore listo para escribir con `setDoc` (idempotente: mismos ids siempre). */
export type DocSembrado = [ruta: string, datos: Record<string, unknown>]

const VIGENCIA_MS = 7 * 24 * 3_600_000

/**
 * Convierte los datos de ejemplo de `src/mocks/data.ts` en documentos de Firestore con los
 * mismos ids (así los mensajes, sesiones y grabaciones de ejemplo siguen apareciendo).
 * `u-carlos` se reemplaza por la cuenta real que inició sesión en el emulador.
 */
export function documentosDeEjemplo(uid: string, correo: string, ahora: number): DocSembrado[] {
  const real = (u: string): string => (u === CURRENT_UID ? uid : u)
  const marca = Timestamp.fromMillis(ahora)
  const docs: DocSembrado[] = []

  for (const u of usuarios.filter((x) => x.uid !== CURRENT_UID)) {
    docs.push([`nombresUsuario/${u.usuario}`, { uid: u.uid }])
    docs.push([
      `usuarios/${u.uid}`,
      {
        nombre: u.nombre, usuario: u.usuario, iniciales: u.iniciales, color: u.color, estado: u.estado,
        ...(u.estadoTexto ? { estadoTexto: u.estadoTexto } : {}),
        creadoEn: marca, actualizadoEn: marca,
      },
    ])
  }
  for (const s of servidores) {
    docs.push([
      `servidores/${s.servidorId}`,
      {
        nombre: s.nombre, descripcion: s.descripcion, iniciales: s.iniciales, color: s.color,
        propietarioUid: real(s.propietarioUid), privacidad: s.privacidad, creadoEn: marca,
      },
    ])
  }
  for (const m of miembros) {
    const quien = real(m.uid)
    const correoDe = quien === uid ? correo : (usuarios.find((u) => u.uid === m.uid)?.correo ?? `${quien}@demo.talkwith`)
    docs.push([
      `servidores/${m.servidorId}/miembros/${quien}`,
      {
        uid: quien, servidorId: m.servidorId, rol: m.rol, unidoEn: Timestamp.fromDate(new Date(m.unidoEn)), correo: correoDe,
        ...(m.grupo ? { grupo: m.grupo } : {}),
      },
    ])
  }
  for (const c of canales) {
    docs.push([
      `servidores/${c.servidorId}/canales/${c.canalId}`,
      {
        servidorId: c.servidorId, nombre: c.nombre, tipo: c.tipo,
        ...(c.descripcion ? { descripcion: c.descripcion } : {}),
        ...(c.privado !== undefined ? { privado: c.privado } : {}),
      },
    ])
  }
  for (const i of invitaciones) {
    const s = servidores.find((x) => x.servidorId === i.servidorId)!
    docs.push([
      `invitaciones/${i.codigo.toLowerCase()}`,
      {
        servidorId: i.servidorId, invitaUid: real(i.invitaUid), creadaEn: marca,
        expiraEn: Timestamp.fromMillis(ahora + VIGENCIA_MS),
        servidorNombre: s.nombre, servidorIniciales: s.iniciales, servidorColor: s.color,
      },
    ])
  }
  return docs
}
