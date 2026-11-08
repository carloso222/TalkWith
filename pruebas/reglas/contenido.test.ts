import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()
const db = (uid: string) => fs(como(entorno(), uid))

describe('[DoD-19] mensajes', () => {
  const m1 = 'servidores/A/canales/general/mensajes/m1'
  const nuevo = (autorUid: string) => ({
    servidorId: 'A', canalId: 'general', autorUid, contenido: 'mensaje nuevo', creadoEn: serverTimestamp(), terminos: ['mensaje', 'nuevo'],
  })
  const editado = { contenido: 'editado', terminos: ['editado'], editadoEn: serverTimestamp() }

  it('un miembro crea un mensaje propio; con autorUid ajeno se rechaza', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'servidores/A/canales/general/mensajes/m2'), nuevo('ana')))
    await assertFails(setDoc(doc(db('ana'), 'servidores/A/canales/general/mensajes/m3'), nuevo('luis')))
  })

  it('un no miembro no crea mensajes', async () => {
    await assertFails(setDoc(doc(db('bruno'), 'servidores/A/canales/general/mensajes/m4'), nuevo('bruno')))
  })

  it('un mensaje con fecha falsificada se rechaza', async () => {
    const falso = { ...nuevo('ana'), creadoEn: new Date('2020-01-01') }
    await assertFails(setDoc(doc(db('ana'), 'servidores/A/canales/general/mensajes/m5'), falso))
  })

  it('solo el autor edita su mensaje', async () => {
    await assertFails(updateDoc(doc(db('luis'), m1), editado))
    await assertFails(updateDoc(doc(db('admin'), m1), editado))
    await assertSucceeds(updateDoc(doc(db('ana'), m1), editado))
  })

  it('un miembro no borra un mensaje ajeno; un admin sí; el autor también', async () => {
    await assertFails(deleteDoc(doc(db('luis'), m1)))
    await assertSucceeds(deleteDoc(doc(db('admin'), m1)))
  })

  it('el autor borra su propio mensaje', async () => {
    await assertSucceeds(deleteDoc(doc(db('ana'), m1)))
  })
})

describe('[DoD-20] segmentos y consentimientos', () => {
  const segmento = (hablanteUid: string) => ({
    servidorId: 'A', sesionId: 's1', hablanteUid, texto: 'una frase', marcaTiempo: '00:05', creadoEn: serverTimestamp(), terminos: [],
  })
  const consentimiento = (uid: string, estado = 'aceptado') => ({ uid, sesionId: 's1', estado, actualizadoEn: serverTimestamp() })

  it('un segmento con hablanteUid ajeno se rechaza; con el propio se permite', async () => {
    await assertFails(setDoc(doc(db('luis'), 'servidores/A/sesiones/s1/segmentos/g2'), segmento('ana')))
    await assertSucceeds(setDoc(doc(db('luis'), 'servidores/A/sesiones/s1/segmentos/g3'), segmento('luis')))
  })

  it('los segmentos no se editan', async () => {
    await assertFails(updateDoc(doc(db('ana'), 'servidores/A/sesiones/s1/segmentos/g1'), { texto: 'otra cosa' }))
  })

  it('un consentimiento escrito en el doc de otro uid se rechaza', async () => {
    await assertFails(setDoc(doc(db('luis'), 'servidores/A/sesiones/s1/consentimientos/ana'), consentimiento('ana', 'rechazado')))
    await assertFails(setDoc(doc(db('luis'), 'servidores/A/sesiones/s1/consentimientos/luis'), consentimiento('ana')))
  })

  it('cada quien escribe su propio consentimiento, con un estado válido', async () => {
    const ruta = 'servidores/A/sesiones/s1/consentimientos/luis'
    await assertSucceeds(setDoc(doc(db('luis'), ruta), consentimiento('luis')))
    await assertFails(setDoc(doc(db('luis'), ruta), consentimiento('luis', 'quizas')))
  })

  it('un no miembro no escribe consentimientos', async () => {
    await assertFails(setDoc(doc(db('bruno'), 'servidores/A/sesiones/s1/consentimientos/bruno'), consentimiento('bruno')))
  })
})

describe('sesiones de voz', () => {
  const s1 = 'servidores/A/sesiones/s1'

  it('un miembro se agrega a la llamada pero no agrega a otro', async () => {
    await assertSucceeds(updateDoc(doc(db('luis'), s1), { participantes: ['ana', 'luis'] }))
    await assertFails(updateDoc(doc(db('luis'), s1), { participantes: ['ana', 'luis', 'admin'] }))
  })

  it('un no miembro no modifica la sesión', async () => {
    await assertFails(updateDoc(doc(db('bruno'), s1), { participantes: ['ana', 'bruno'] }))
  })
})

describe('metadatos de grabaciones', () => {
  const nueva = (creadorUid: string, ruta: string) => ({
    servidorId: 'A', sesionId: 's1', titulo: 'Nueva', canalNombre: 'voz', fecha: '2026-11-07', duracion: '5 min',
    creadorUid, tamano: '1 MB', ruta, estado: 'subiendo', aceptaron: 2, participantes: 2,
  })

  it('con consentimiento propio aceptado se crea; sin él se rechaza', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'servidores/A/sesiones/s1/grabaciones/r2'), nueva('ana', 'grabaciones/A/s1/r2.webm')))
    await assertFails(setDoc(doc(db('luis'), 'servidores/A/sesiones/s1/grabaciones/r3'), nueva('luis', 'grabaciones/A/s1/r3.webm')))
  })

  it('una ruta de otro servidor o un creador ajeno se rechazan', async () => {
    await assertFails(setDoc(doc(db('ana'), 'servidores/A/sesiones/s1/grabaciones/r4'), nueva('ana', 'grabaciones/B/s1/r4.webm')))
    await assertFails(setDoc(doc(db('ana'), 'servidores/A/sesiones/s1/grabaciones/r5'), nueva('luis', 'grabaciones/A/s1/r5.webm')))
  })
})
