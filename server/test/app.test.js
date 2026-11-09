import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { io as conectar } from 'socket.io-client'
import { crearServidor } from '../src/app.js'
import { duracionTexto } from '../src/firebase.js'

// firebase falso: el token "ok-ana" es valido y pertenece a "ana"
const verificarToken = async (token) => {
  if (!token.startsWith('ok-')) throw new Error('token malo')
  return token.slice(3)
}
// "intruso" no es miembro de nada y "texto" no es canal de voz
const puedeVerServidor = async (uid) => uid !== 'intruso'
const puedeEntrarCanal = async (uid, servidorId, canalId) => uid !== 'intruso' && canalId !== 'texto'
// y solo se escribe en canales de texto
const puedeEscribirCanal = async (uid, servidorId, canalId) => uid !== 'intruso' && canalId.startsWith('texto')

// mensajes guardados por el servidor falso (la hora avanza de uno en uno para ver el orden)
let guardados = []
let reloj = 1000
const mensajes = {
  guardar: async (m) => {
    guardados.push(m)
    return { mensajeId: `m${guardados.length}`, creadoMs: ++reloj }
  },
}

// participante sin el numero de conexion, que cambia en cada prueba
const sinConexion = ({ conexion: _conexion, ...resto }) => resto

let llamadas
let contador = 0
const sesiones = {
  crear: async (servidorId, canalId, uid) => {
    llamadas.push(['crear', servidorId, canalId, uid])
    return `sesion-${++contador}`
  },
  agregar: async (servidorId, sesionId, uid) => llamadas.push(['agregar', sesionId, uid]),
  cerrar: async (servidorId, sesionId) => llamadas.push(['cerrar', sesionId]),
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

let servidor
let url
const abiertos = []

function cliente(token, opciones = {}) {
  const socket = conectar(url, { auth: token === undefined ? {} : { token }, reconnection: false, forceNew: true, ...opciones })
  abiertos.push(socket)
  return socket
}

const conectado = (socket) =>
  new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('connect_error', reject)
  })

const pedir = (socket, evento, datos) => new Promise((resolve) => socket.emit(evento, datos, resolve))

const siguiente = (socket, evento, cumple = () => true) =>
  new Promise((resolve) => {
    const revisar = (datos) => {
      if (!cumple(datos)) return
      socket.off(evento, revisar)
      resolve(datos)
    }
    socket.on(evento, revisar)
  })

before(async () => {
  servidor = crearServidor({
    origenes: ['http://localhost:5173'],
    verificarToken,
    puedeVerServidor,
    puedeEntrarCanal,
    puedeEscribirCanal,
    sesiones,
    mensajes,
    esperaReconexion: 150,
    esperaCerrarSesion: 100,
  })
  await new Promise((r) => servidor.http.listen(0, r))
  url = `http://localhost:${servidor.http.address().port}`
})

beforeEach(() => {
  llamadas = []
  guardados = []
  while (abiertos.length) abiertos.pop().disconnect()
})

after(() => {
  while (abiertos.length) abiertos.pop().disconnect()
  servidor.cerrar()
})

describe('autenticacion', () => {
  test('rechaza a quien no manda token', async () => {
    await assert.rejects(conectado(cliente(undefined)), { message: 'sin-token' })
  })

  test('rechaza un token invalido', async () => {
    await assert.rejects(conectado(cliente('falso')), { message: 'token-invalido' })
  })

  test('acepta un token valido', async () => {
    const socket = cliente('ok-ana')
    await conectado(socket)
    assert.equal(socket.connected, true)
  })

  test('la ruta de salud responde', async () => {
    const respuesta = await fetch(`${url}/salud`)
    assert.deepEqual(await respuesta.json(), { ok: true })
  })
})

describe('salas de voz', () => {
  test('la primera persona abre la sesion y recibe la lista', async () => {
    const ana = cliente('ok-ana')
    await conectado(ana)
    const r = await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-a' })
    assert.equal(r.ok, true)
    assert.match(r.sesionId, /^sesion-/)
    assert.deepEqual(r.participantes.map(sinConexion), [{ uid: 'ana', silenciado: false, hablando: false, reconectando: false }])
    assert.equal(r.participantes[0].conexion, r.conexion)
    assert.deepEqual(llamadas.filter((l) => l[0] === 'crear'), [['crear', 's1', 'voz-a', 'ana']])
  })

  test('no deja entrar sin permiso ni a un canal de texto', async () => {
    const intruso = cliente('ok-intruso')
    await conectado(intruso)
    assert.deepEqual(await pedir(intruso, 'sala:unirse', { servidorId: 's1', canalId: 'voz-b' }), { ok: false, error: 'sin-permiso' })
    const ana = cliente('ok-ana')
    await conectado(ana)
    assert.deepEqual(await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'texto' }), { ok: false, error: 'sin-permiso' })
    assert.deepEqual(await pedir(ana, 'sala:unirse', { servidorId: '../x', canalId: 'voz' }), { ok: false, error: 'datos-invalidos' })
  })

  test('la segunda persona usa la misma sesion y todos ven la lista', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    const primera = await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-c' })
    const aviso = siguiente(ana, 'sala:participantes', (d) => d.participantes.length === 2)
    const r = await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-c' })
    assert.equal(r.sesionId, primera.sesionId)
    assert.deepEqual((await aviso).participantes.map((p) => p.uid), ['ana', 'beto'])
    await esperar(20)
    assert.deepEqual(llamadas.filter((l) => l[0] === 'agregar'), [['agregar', primera.sesionId, 'beto']])
  })

  test('el silencio y el estado de hablando llegan a los demas', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-d' })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-d' })
    const aviso = siguiente(beto, 'sala:participantes', (d) => d.participantes.some((p) => p.uid === 'ana' && p.silenciado))
    ana.emit('sala:estado', { silenciado: true, hablando: true })
    const ana2 = (await aviso).participantes.find((p) => p.uid === 'ana')
    // silenciado nunca cuenta como hablando
    assert.deepEqual(sinConexion(ana2), { uid: 'ana', silenciado: true, hablando: false, reconectando: false })
  })

  test('salir avisa a los demas y la sesion se cierra cuando la sala queda vacia', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    const { sesionId } = await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-e' })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-e' })
    const aviso = siguiente(ana, 'sala:participantes', (d) => d.participantes.length === 1)
    await pedir(beto, 'sala:salir')
    assert.deepEqual((await aviso).participantes.map((p) => p.uid), ['ana'])
    await pedir(ana, 'sala:salir')
    await esperar(160)
    assert.deepEqual(llamadas.filter((l) => l[1] === sesionId && l[0] === 'cerrar'), [['cerrar', sesionId]])
  })

  test('si alguien entra antes de que cierre, sigue la misma sesion', async () => {
    const ana = cliente('ok-ana')
    await conectado(ana)
    const primera = await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-f' })
    await pedir(ana, 'sala:salir')
    const r = await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-f' })
    assert.equal(r.sesionId, primera.sesionId)
    await esperar(160)
    assert.equal(llamadas.some((l) => l[0] === 'cerrar' && l[1] === primera.sesionId), false)
    assert.equal(llamadas.filter((l) => l[0] === 'crear' && l[2] === 'voz-f').length, 1)
  })
})

describe('reconexion', () => {
  test('una caida corta deja a la persona como reconectando y al volver sigue en la sala', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-g' })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-g' })

    const cayo = siguiente(ana, 'sala:participantes', (d) => d.participantes.some((p) => p.uid === 'beto' && p.reconectando))
    beto.disconnect()
    await cayo

    const beto2 = cliente('ok-beto')
    await conectado(beto2)
    const antes = servidor.salas.get('s1/voz-g').personas.get('beto').conexion
    const r = await pedir(beto2, 'sala:unirse', { servidorId: 's1', canalId: 'voz-g' })
    assert.deepEqual(sinConexion(r.participantes.find((p) => p.uid === 'beto')), { uid: 'beto', silenciado: false, hablando: false, reconectando: false })
    // al volver cambia su conexion para que los demas rehagan el audio
    assert.notEqual(r.conexion, antes)
    await esperar(200)
    assert.equal(servidor.salas.get('s1/voz-g').personas.has('beto'), true)
  })

  test('si no vuelve a tiempo sale de la sala', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-h' })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-h' })
    const salio = siguiente(ana, 'sala:participantes', (d) => d.participantes.length === 1)
    beto.disconnect()
    assert.deepEqual((await salio).participantes.map((p) => p.uid), ['ana'])
  })
})

describe('llamadas del servidor', () => {
  test('la barra de canales recibe quien esta en cada canal de voz', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    const vista = await pedir(beto, 'servidor:ver', { servidorId: 's2' })
    assert.deepEqual(vista, { ok: true, llamadas: {} })
    const aviso = siguiente(beto, 'servidor:llamadas', (d) => d.llamadas['voz-i'])
    await pedir(ana, 'sala:unirse', { servidorId: 's2', canalId: 'voz-i' })
    assert.deepEqual((await aviso).llamadas['voz-i'].map((p) => p.uid), ['ana'])
  })

  test('no deja ver un servidor ajeno', async () => {
    const intruso = cliente('ok-intruso')
    await conectado(intruso)
    assert.deepEqual(await pedir(intruso, 'servidor:ver', { servidorId: 's2' }), { ok: false, error: 'sin-permiso' })
  })
})

describe('senalizacion webrtc (TW 13)', () => {
  test('pasa la oferta solo a la persona indicada de la misma sala', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    const caro = cliente('ok-caro')
    await Promise.all([conectado(ana), conectado(beto), conectado(caro)])
    const ra = await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-r' })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-r' })
    await pedir(caro, 'sala:unirse', { servidorId: 's1', canalId: 'voz-r' })

    let caroRecibio = false
    caro.on('rtc:senal', () => (caroRecibio = true))
    const llega = siguiente(beto, 'rtc:senal')
    ana.emit('rtc:senal', { para: 'beto', datos: { tipo: 'oferta', sdp: { type: 'offer', sdp: 'v=0' } } })
    assert.deepEqual(await llega, { de: 'ana', conexion: ra.conexion, datos: { tipo: 'oferta', sdp: { type: 'offer', sdp: 'v=0' } } })
    await esperar(30)
    assert.equal(caroRecibio, false)
  })

  test('no pasa senales a otra sala, a uno mismo, de tipo raro o muy grandes', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    await pedir(ana, 'sala:unirse', { servidorId: 's1', canalId: 'voz-s' })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-t' })
    let recibidas = 0
    beto.on('rtc:senal', () => recibidas++)
    ana.on('rtc:senal', () => recibidas++)
    ana.emit('rtc:senal', { para: 'beto', datos: { tipo: 'oferta', sdp: {} } })
    ana.emit('rtc:senal', { para: 'ana', datos: { tipo: 'oferta', sdp: {} } })
    await pedir(beto, 'sala:unirse', { servidorId: 's1', canalId: 'voz-s' })
    ana.emit('rtc:senal', { para: 'beto', datos: { tipo: 'virus' } })
    ana.emit('rtc:senal', { para: 'beto', datos: { tipo: 'candidato', candidato: 'x'.repeat(30000) } })
    await esperar(50)
    assert.equal(recibidas, 0)
  })
})

describe('mensajes de texto (TW 09)', () => {
  test('dos clientes reciben el mensaje y se guarda una vez', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    assert.deepEqual(await pedir(ana, 'canal:entrar', { servidorId: 's1', canalId: 'texto-a' }), { ok: true })
    await pedir(beto, 'canal:entrar', { servidorId: 's1', canalId: 'texto-a' })

    const llegaAna = siguiente(ana, 'mensaje:nuevo')
    const llegaBeto = siguiente(beto, 'mensaje:nuevo')
    const r = await pedir(ana, 'mensaje:enviar', { servidorId: 's1', canalId: 'texto-a', contenido: '  hola equipo  ' })
    assert.equal(r.ok, true)
    const esperado = { mensajeId: 'm1', servidorId: 's1', canalId: 'texto-a', autorUid: 'ana', contenido: 'hola equipo', creadoMs: r.mensaje.creadoMs }
    assert.deepEqual(r.mensaje, esperado)
    assert.deepEqual(await llegaAna, esperado)
    assert.deepEqual(await llegaBeto, esperado)
    assert.deepEqual(guardados, [{ servidorId: 's1', canalId: 'texto-a', autorUid: 'ana', contenido: 'hola equipo' }])
  })

  test('los mensajes llegan en el orden en que se mandaron', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    await pedir(beto, 'canal:entrar', { servidorId: 's1', canalId: 'texto-b' })
    const recibidos = []
    beto.on('mensaje:nuevo', (m) => recibidos.push(m))
    for (const contenido of ['uno', 'dos', 'tres']) await pedir(ana, 'mensaje:enviar', { servidorId: 's1', canalId: 'texto-b', contenido })
    await esperar(30)
    assert.deepEqual(recibidos.map((m) => m.contenido), ['uno', 'dos', 'tres'])
    assert.ok(recibidos[0].creadoMs < recibidos[1].creadoMs && recibidos[1].creadoMs < recibidos[2].creadoMs)
  })

  test('solo llega a quien esta en ese canal', async () => {
    const ana = cliente('ok-ana')
    const beto = cliente('ok-beto')
    await Promise.all([conectado(ana), conectado(beto)])
    await pedir(beto, 'canal:entrar', { servidorId: 's1', canalId: 'texto-otro' })
    let llego = false
    beto.on('mensaje:nuevo', () => (llego = true))
    await pedir(ana, 'mensaje:enviar', { servidorId: 's1', canalId: 'texto-c', contenido: 'hola' })
    await esperar(30)
    assert.equal(llego, false)
  })

  test('rechaza mensajes vacios, muy largos, sin permiso o en canales de voz', async () => {
    const ana = cliente('ok-ana')
    const intruso = cliente('ok-intruso')
    await Promise.all([conectado(ana), conectado(intruso)])
    const enviar = (s, datos) => pedir(s, 'mensaje:enviar', { servidorId: 's1', canalId: 'texto-d', ...datos })
    assert.deepEqual(await enviar(ana, { contenido: '   ' }), { ok: false, error: 'mensaje-invalido' })
    assert.deepEqual(await enviar(ana, { contenido: 'x'.repeat(4001) }), { ok: false, error: 'mensaje-invalido' })
    assert.deepEqual(await enviar(intruso, { contenido: 'hola' }), { ok: false, error: 'sin-permiso' })
    assert.deepEqual(await enviar(ana, { canalId: 'voz-a', contenido: 'hola' }), { ok: false, error: 'sin-permiso' })
    assert.deepEqual(await pedir(intruso, 'canal:entrar', { servidorId: 's1', canalId: 'texto-d' }), { ok: false, error: 'sin-permiso' })
    assert.equal(guardados.length, 0)
  })

  test('frena a quien manda demasiados mensajes seguidos', async () => {
    const ana = cliente('ok-ana')
    await conectado(ana)
    const respuestas = []
    for (let i = 0; i < 12; i++) respuestas.push(await pedir(ana, 'mensaje:enviar', { servidorId: 's1', canalId: 'texto-e', contenido: `m${i}` }))
    assert.equal(respuestas.filter((r) => r.ok).length, 10)
    assert.deepEqual(respuestas.at(-1), { ok: false, error: 'muy-rapido' })
  })
})

test('duracionTexto', () => {
  assert.equal(duracionTexto(0), '00:00:00')
  assert.equal(duracionTexto(1458000), '00:24:18')
  assert.equal(duracionTexto(3725000), '01:02:05')
})
