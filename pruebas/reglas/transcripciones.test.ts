import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { como, fs, prepararEntorno } from './entorno.ts'

const entorno = prepararEntorno()
const db = (uid: string) => fs(como(entorno(), uid))

// lo mismo que escribe sessionService.addSegment (TW 17)
function guardarSegmento(uid: string, hablanteUid = uid, id = 'g9') {
  const base = db(uid)
  const batch = writeBatch(base)
  batch.set(doc(base, `servidores/A/sesiones/s1/segmentos/${id}`), {
    servidorId: 'A',
    sesionId: 's1',
    hablanteUid,
    texto: 'Revisemos los permisos',
    marcaTiempo: '16:20:01',
    creadoEn: serverTimestamp(),
    terminos: ['revisemos', 'permisos'],
  })
  batch.update(doc(base, 'servidores/A/sesiones/s1'), { totalSegmentos: increment(1) })
  return batch.commit()
}

describe('[TW 17] transcripciones', () => {
  it('un miembro guarda su segmento y suma uno al total de la sesion', async () => {
    await assertSucceeds(guardarSegmento('luis'))
    const sesion = await getDoc(doc(db('luis'), 'servidores/A/sesiones/s1'))
    if (sesion.get('totalSegmentos') !== 2) throw new Error(`total esperado 2, llegó ${sesion.get('totalSegmentos')}`)
  })

  it('nadie guarda un segmento a nombre de otra persona', async () => {
    await assertFails(guardarSegmento('luis', 'ana'))
  })

  it('alguien de otro servidor no guarda segmentos', async () => {
    await assertFails(guardarSegmento('bruno'))
  })

  it('un miembro lee los segmentos; alguien de fuera no', async () => {
    await assertSucceeds(getDoc(doc(db('luis'), 'servidores/A/sesiones/s1/segmentos/g1')))
    await assertFails(getDoc(doc(db('bruno'), 'servidores/A/sesiones/s1/segmentos/g1')))
  })
})
