import { createServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'

// tiempo que esperamos a alguien que perdio la conexion antes de sacarlo de la sala
const ESPERA_RECONEXION_MS = 15000
// tiempo que la sesion sigue abierta cuando la sala se queda vacia
const ESPERA_CERRAR_SESION_MS = 10000

// largo maximo de un mensaje (igual que las reglas de firestore)
const MAX_MENSAJE = 4000
// cuantos mensajes puede mandar alguien en la ventana de tiempo
const MAX_MENSAJES_SEGUIDOS = 10
const VENTANA_MENSAJES_MS = 10000
// tamano maximo de una senal de webrtc (oferta, respuesta o candidato)
const MAX_SENAL = 20000
const TIPOS_SENAL = ['oferta', 'respuesta', 'candidato']

// ids de firestore que aceptamos (letras, numeros, guion y guion bajo)
const esId = (valor) => typeof valor === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(valor)

const registrarError = (que) => (error) => console.error(`error al ${que}:`, error?.message ?? error)

/**
 * Crea el servidor http y socket.io. Las funciones de firebase llegan por parametro
 * para poder probarlo sin conectarse a firebase.
 */
export function crearServidor({
  origenes,
  verificarToken,
  puedeVerServidor,
  puedeEntrarCanal,
  puedeEscribirCanal,
  sesiones,
  mensajes,
  esperaReconexion = ESPERA_RECONEXION_MS,
  esperaCerrarSesion = ESPERA_CERRAR_SESION_MS,
}) {
  const app = express()
  app.get('/', (req, res) => res.json({ ok: true, servicio: 'talkwith-servidor' }))
  // render revisa esta ruta para saber si el servidor sigue vivo
  app.get('/salud', (req, res) => res.json({ ok: true }))

  const http = createServer(app)
  const io = new Server(http, { cors: { origin: origenes } })

  // salas abiertas, la clave es "servidorId/canalId"
  const salas = new Map()
  // cambia cada vez que alguien entra a una sala, asi los demas saben que hay que rehacer el audio
  let contadorConexiones = 0

  // solo dejamos conectarse a quien manda un token de firebase valido
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string' || token === '') return next(new Error('sin-token'))
    try {
      socket.data.uid = await verificarToken(token)
      next()
    } catch {
      next(new Error('token-invalido'))
    }
  })

  function participantesDe(sala) {
    return [...sala.personas.entries()].map(([uid, p]) => ({
      uid,
      silenciado: p.silenciado,
      hablando: p.hablando,
      reconectando: p.sockets.size === 0,
      conexion: p.conexion,
    }))
  }

  function llamadasDe(servidorId) {
    const llamadas = {}
    for (const sala of salas.values()) {
      if (sala.servidorId === servidorId && sala.personas.size > 0) llamadas[sala.canalId] = participantesDe(sala)
    }
    return llamadas
  }

  // avisa a la sala y a quien esta viendo el servidor
  function avisar(sala) {
    const { servidorId, canalId } = sala
    io.to(sala.clave).emit('sala:participantes', { servidorId, canalId, participantes: participantesDe(sala) })
    io.to(`servidor:${servidorId}`).emit('servidor:llamadas', { servidorId, llamadas: llamadasDe(servidorId) })
  }

  async function cerrarSala(sala) {
    if (sala.personas.size > 0 || salas.get(sala.clave) !== sala) return
    salas.delete(sala.clave)
    await sala.creando
    if (sala.sesionId) await sesiones.cerrar(sala.servidorId, sala.sesionId, sala.inicio).catch(registrarError('cerrar la sesion'))
  }

  function quitarPersona(sala, uid) {
    const persona = sala.personas.get(uid)
    if (!persona) return
    clearTimeout(persona.temporizador)
    sala.personas.delete(uid)
    avisar(sala)
    // no cerramos la sesion luego luego por si alguien vuelve a entrar
    if (sala.personas.size === 0) sala.temporizador = setTimeout(() => cerrarSala(sala), esperaCerrarSesion)
  }

  function salirDeSala(socket) {
    const sala = salas.get(socket.data.sala)
    socket.leave(socket.data.sala)
    socket.data.sala = null
    const persona = sala?.personas.get(socket.data.uid)
    if (!persona) return
    persona.sockets.delete(socket.id)
    if (persona.sockets.size === 0) quitarPersona(sala, socket.data.uid)
  }

  io.on('connection', (socket) => {
    const uid = socket.data.uid

    socket.on('sala:unirse', async (datos, responder) => {
      if (typeof responder !== 'function') return
      const servidorId = datos?.servidorId
      const canalId = datos?.canalId
      if (!esId(servidorId) || !esId(canalId)) return responder({ ok: false, error: 'datos-invalidos' })

      let permitido = false
      try {
        permitido = await puedeEntrarCanal(uid, servidorId, canalId)
      } catch (error) {
        registrarError('revisar el permiso')(error)
        return responder({ ok: false, error: 'error-servidor' })
      }
      if (!permitido) return responder({ ok: false, error: 'sin-permiso' })
      if (!socket.connected) return

      const clave = `${servidorId}/${canalId}`
      if (socket.data.sala && socket.data.sala !== clave) salirDeSala(socket)

      let sala = salas.get(clave)
      if (!sala) {
        sala = { clave, servidorId, canalId, personas: new Map(), sesionId: null, inicio: Date.now(), creando: null, temporizador: null }
        salas.set(clave, sala)
      }
      clearTimeout(sala.temporizador)

      let persona = sala.personas.get(uid)
      const esNuevo = !persona
      if (!persona) {
        persona = { silenciado: false, hablando: false, sockets: new Set(), temporizador: null }
        sala.personas.set(uid, persona)
      }
      // si venia de una reconexion ya no lo sacamos
      clearTimeout(persona.temporizador)
      persona.sockets.add(socket.id)
      persona.ultimoSocket = socket.id
      persona.conexion = ++contadorConexiones
      socket.data.sala = clave
      socket.join(clave)

      // la primera persona abre la sesion en firestore y las demas se agregan
      if (!sala.creando) {
        sala.creando = sesiones
          .crear(servidorId, canalId, uid)
          .then((id) => (sala.sesionId = id))
          .catch(registrarError('crear la sesion'))
      } else if (esNuevo) {
        sala.creando
          .then(() => sala.sesionId && sesiones.agregar(servidorId, sala.sesionId, uid))
          .catch(registrarError('agregar al participante'))
      }
      await sala.creando

      responder({ ok: true, sesionId: sala.sesionId, inicio: sala.inicio, conexion: persona.conexion, participantes: participantesDe(sala) })
      avisar(sala)
    })

    // se puede llamar con o sin datos antes de la respuesta
    socket.on('sala:salir', (...args) => {
      if (socket.data.sala) salirDeSala(socket)
      const responder = args.find((a) => typeof a === 'function')
      if (responder) responder({ ok: true })
    })

    // microfono silenciado y si esta hablando
    socket.on('sala:estado', (datos) => {
      const sala = salas.get(socket.data.sala)
      const persona = sala?.personas.get(uid)
      if (!persona) return
      const silenciado = Boolean(datos?.silenciado)
      const hablando = Boolean(datos?.hablando) && !silenciado
      if (persona.silenciado === silenciado && persona.hablando === hablando) return
      persona.silenciado = silenciado
      persona.hablando = hablando
      avisar(sala)
    })

    // webrtc: el servidor solo pasa la senal a la otra persona de la misma sala (TW 13)
    socket.on('rtc:senal', (datos) => {
      const sala = salas.get(socket.data.sala)
      const yo = sala?.personas.get(uid)
      const otro = sala?.personas.get(datos?.para)
      if (!yo || !otro || datos.para === uid) return
      const senal = datos.datos
      if (!TIPOS_SENAL.includes(senal?.tipo)) return
      if (JSON.stringify(senal).length > MAX_SENAL) return
      // se manda a la pestana con la que entro mas recientemente
      if (!otro.sockets.has(otro.ultimoSocket)) return
      io.to(otro.ultimoSocket).emit('rtc:senal', { de: uid, conexion: yo.conexion, datos: senal })
    })

    // ---------- canales de texto (TW 09) ----------

    // revisa una sola vez por socket que pueda escribir en el canal
    async function permisoTexto(servidorId, canalId) {
      const clave = `${servidorId}/${canalId}`
      if (!socket.data.canalesTexto) socket.data.canalesTexto = new Set()
      if (socket.data.canalesTexto.has(clave)) return true
      const permitido = await puedeEscribirCanal(uid, servidorId, canalId)
      if (permitido) socket.data.canalesTexto.add(clave)
      return permitido
    }

    socket.on('canal:entrar', async (datos, responder) => {
      if (typeof responder !== 'function') return
      const servidorId = datos?.servidorId
      const canalId = datos?.canalId
      if (!esId(servidorId) || !esId(canalId)) return responder({ ok: false, error: 'datos-invalidos' })
      let permitido = false
      try {
        permitido = await permisoTexto(servidorId, canalId)
      } catch (error) {
        registrarError('revisar el permiso')(error)
        return responder({ ok: false, error: 'error-servidor' })
      }
      if (!permitido) return responder({ ok: false, error: 'sin-permiso' })
      if (socket.data.canalTexto) socket.leave(`texto:${socket.data.canalTexto}`)
      socket.data.canalTexto = `${servidorId}/${canalId}`
      socket.join(`texto:${servidorId}/${canalId}`)
      responder({ ok: true })
    })

    socket.on('canal:salir', () => {
      if (socket.data.canalTexto) socket.leave(`texto:${socket.data.canalTexto}`)
      socket.data.canalTexto = null
    })

    socket.on('mensaje:enviar', async (datos, responder) => {
      if (typeof responder !== 'function') return
      const servidorId = datos?.servidorId
      const canalId = datos?.canalId
      const contenido = typeof datos?.contenido === 'string' ? datos.contenido.trim() : ''
      if (!esId(servidorId) || !esId(canalId)) return responder({ ok: false, error: 'datos-invalidos' })
      if (!contenido || contenido.length > MAX_MENSAJE) return responder({ ok: false, error: 'mensaje-invalido' })

      // evita que alguien llene el canal de mensajes
      const ahora = Date.now()
      socket.data.envios = (socket.data.envios ?? []).filter((t) => ahora - t < VENTANA_MENSAJES_MS)
      if (socket.data.envios.length >= MAX_MENSAJES_SEGUIDOS) return responder({ ok: false, error: 'muy-rapido' })
      socket.data.envios.push(ahora)

      try {
        if (!(await permisoTexto(servidorId, canalId))) return responder({ ok: false, error: 'sin-permiso' })
        const guardado = await mensajes.guardar({ servidorId, canalId, autorUid: uid, contenido })
        const mensaje = { mensajeId: guardado.mensajeId, servidorId, canalId, autorUid: uid, contenido, creadoMs: guardado.creadoMs }
        io.to(`texto:${servidorId}/${canalId}`).emit('mensaje:nuevo', mensaje)
        responder({ ok: true, mensaje })
      } catch (error) {
        registrarError('guardar el mensaje')(error)
        responder({ ok: false, error: 'error-servidor' })
      }
    })

    // la barra de canales pide quien esta en llamada en cada canal del servidor
    socket.on('servidor:ver', async (datos, responder) => {
      if (typeof responder !== 'function') return
      const servidorId = datos?.servidorId
      if (!esId(servidorId)) return responder({ ok: false, error: 'datos-invalidos' })
      let permitido = false
      try {
        permitido = await puedeVerServidor(uid, servidorId)
      } catch (error) {
        registrarError('revisar el permiso')(error)
        return responder({ ok: false, error: 'error-servidor' })
      }
      if (!permitido) return responder({ ok: false, error: 'sin-permiso' })
      if (socket.data.servidor) socket.leave(`servidor:${socket.data.servidor}`)
      socket.data.servidor = servidorId
      socket.join(`servidor:${servidorId}`)
      responder({ ok: true, llamadas: llamadasDe(servidorId) })
    })

    socket.on('disconnect', () => {
      const sala = salas.get(socket.data.sala)
      const persona = sala?.personas.get(uid)
      if (!persona) return
      persona.sockets.delete(socket.id)
      if (persona.sockets.size > 0) return
      // se le cayo la conexion: lo dejamos un rato por si regresa
      avisar(sala)
      persona.temporizador = setTimeout(() => quitarPersona(sala, uid), esperaReconexion)
    })
  })

  function cerrar() {
    for (const sala of salas.values()) {
      clearTimeout(sala.temporizador)
      for (const persona of sala.personas.values()) clearTimeout(persona.temporizador)
    }
    io.close()
  }

  return { app, http, io, salas, cerrar }
}
