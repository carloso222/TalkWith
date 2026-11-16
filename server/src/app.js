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
  // identifica cada solicitud de grabacion
  let contadorGrabaciones = 0

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

  // ---------- grabacion con consentimiento (TW 20) ----------
  // sala.grabacion = null | { id, fase: 'solicitada' | 'grabando', solicitante, estados: { uid: estado }, inicio }

  function estadoGrabacion(sala) {
    const g = sala.grabacion
    return g ? { id: g.id, fase: g.fase, solicitante: g.solicitante, estados: { ...g.estados }, inicio: g.inicio ?? null } : null
  }

  // todos en la sala ven lo mismo: quien pidio, quien acepto y si ya se graba
  function avisarGrabacion(sala, extra = {}) {
    const { servidorId, canalId } = sala
    io.to(sala.clave).emit('grabacion:estado', { servidorId, canalId, grabacion: estadoGrabacion(sala), ...extra })
  }

  function terminarGrabacion(sala, motivo, por) {
    if (!sala.grabacion) return
    sala.grabacion = null
    avisarGrabacion(sala, { motivo, por })
  }

  // la grabacion empieza solo cuando todas las personas de la sala aceptaron
  function revisarConsentimientos(sala) {
    const g = sala.grabacion
    if (g?.fase !== 'solicitada') return
    if (Object.values(g.estados).every((e) => e === 'aceptado')) {
      g.fase = 'grabando'
      g.inicio = Date.now()
    }
  }

  // deja constancia en firestore de lo que respondio cada quien
  function guardarConsentimiento(sala, uid, estado) {
    if (!sala.sesionId || !sesiones.consentimiento) return
    sesiones.consentimiento(sala.servidorId, sala.sesionId, uid, estado).catch(registrarError('guardar el consentimiento'))
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
    // si sale quien pidio la grabacion (o ya no queda nadie), termina para todos
    const g = sala.grabacion
    if (g && (g.solicitante === uid || sala.personas.size === 0)) {
      terminarGrabacion(sala, 'salio', uid)
    } else if (g?.fase === 'solicitada' && uid in g.estados) {
      // quien se fue ya no tiene que responder
      delete g.estados[uid]
      revisarConsentimientos(sala)
      avisarGrabacion(sala)
    }
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
        sala = { clave, servidorId, canalId, personas: new Map(), sesionId: null, inicio: Date.now(), creando: null, temporizador: null, grabacion: null }
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

      // alguien nuevo no ha dado su consentimiento: si se pedia, le toca responder; si ya se grababa, se detiene
      if (esNuevo && sala.grabacion) {
        if (sala.grabacion.fase === 'solicitada') {
          sala.grabacion.estados[uid] = 'pendiente'
          avisarGrabacion(sala)
        } else {
          terminarGrabacion(sala, 'nuevo-participante', uid)
        }
      }

      responder({
        ok: true,
        sesionId: sala.sesionId,
        inicio: sala.inicio,
        conexion: persona.conexion,
        participantes: participantesDe(sala),
        grabacion: estadoGrabacion(sala),
      })
      avisar(sala)
    })

    // la sala donde estoy, si sigo dentro
    const miSala = () => {
      const sala = salas.get(socket.data.sala)
      return sala?.personas.has(uid) ? sala : null
    }
    const respuesta = (fn) => (typeof fn === 'function' ? fn : () => {})

    // pedir grabar: yo cuento como aceptado y a los demas les llega la solicitud
    socket.on('grabacion:solicitar', (_datos, fn) => {
      const responder = respuesta(fn)
      const sala = miSala()
      if (!sala) return responder({ ok: false, error: 'sin-sala' })
      if (sala.grabacion) return responder({ ok: false, error: 'grabacion-en-curso' })
      const estados = Object.fromEntries([...sala.personas.keys()].map((u) => [u, u === uid ? 'aceptado' : 'pendiente']))
      sala.grabacion = { id: ++contadorGrabaciones, fase: 'solicitada', solicitante: uid, estados, inicio: null }
      guardarConsentimiento(sala, uid, 'aceptado')
      // si estoy solo en la sala, empieza de una vez
      revisarConsentimientos(sala)
      avisarGrabacion(sala)
      responder({ ok: true, grabacion: estadoGrabacion(sala) })
    })

    // aceptar o rechazar; el id evita responder a una solicitud que ya no existe
    socket.on('grabacion:responder', (datos, fn) => {
      const responder = respuesta(fn)
      const sala = miSala()
      const g = sala?.grabacion
      if (!g || g.fase !== 'solicitada' || g.id !== datos?.id || g.estados[uid] !== 'pendiente') {
        return responder({ ok: false, error: 'sin-solicitud' })
      }
      if (datos.acepta !== true) {
        guardarConsentimiento(sala, uid, 'rechazado')
        terminarGrabacion(sala, 'rechazada', uid)
        return responder({ ok: true })
      }
      g.estados[uid] = 'aceptado'
      guardarConsentimiento(sala, uid, 'aceptado')
      revisarConsentimientos(sala)
      avisarGrabacion(sala)
      responder({ ok: true })
    })

    // quien pidio puede cancelar mientras se espera
    socket.on('grabacion:cancelar', (_datos, fn) => {
      const responder = respuesta(fn)
      const sala = miSala()
      if (sala?.grabacion?.fase !== 'solicitada' || sala.grabacion.solicitante !== uid) return responder({ ok: false, error: 'sin-solicitud' })
      terminarGrabacion(sala, 'cancelada', uid)
      responder({ ok: true })
    })

    // cualquiera en la llamada puede detenerla (es su forma de retirar el consentimiento)
    socket.on('grabacion:detener', (_datos, fn) => {
      const responder = respuesta(fn)
      const sala = miSala()
      if (sala?.grabacion?.fase !== 'grabando') return responder({ ok: false, error: 'sin-grabacion' })
      terminarGrabacion(sala, 'detenida', uid)
      responder({ ok: true })
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

    // evita que alguien llene el canal: enviar, editar y borrar cuentan juntos
    function muyRapido() {
      const ahora = Date.now()
      socket.data.envios = (socket.data.envios ?? []).filter((t) => ahora - t < VENTANA_MENSAJES_MS)
      if (socket.data.envios.length >= MAX_MENSAJES_SEGUIDOS) return true
      socket.data.envios.push(ahora)
      return false
    }

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
      if (muyRapido()) return responder({ ok: false, error: 'muy-rapido' })

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

    // editar: solo quien lo escribio. El cambio llega en vivo a quien tiene abierto el canal
    socket.on('mensaje:editar', async (datos, responder) => {
      if (typeof responder !== 'function') return
      const { servidorId, canalId, mensajeId } = datos ?? {}
      const contenido = typeof datos?.contenido === 'string' ? datos.contenido.trim() : ''
      if (!esId(servidorId) || !esId(canalId) || !esId(mensajeId)) return responder({ ok: false, error: 'datos-invalidos' })
      if (!contenido || contenido.length > MAX_MENSAJE) return responder({ ok: false, error: 'mensaje-invalido' })
      if (muyRapido()) return responder({ ok: false, error: 'muy-rapido' })

      try {
        if (!(await permisoTexto(servidorId, canalId))) return responder({ ok: false, error: 'sin-permiso' })
        const r = await mensajes.editar({ servidorId, canalId, mensajeId, uid, contenido })
        if (r.error) return responder({ ok: false, error: r.error })
        const cambio = { mensajeId, servidorId, canalId, contenido, editadoMs: r.editadoMs }
        io.to(`texto:${servidorId}/${canalId}`).emit('mensaje:editado', cambio)
        responder({ ok: true, mensaje: cambio })
      } catch (error) {
        registrarError('editar el mensaje')(error)
        responder({ ok: false, error: 'error-servidor' })
      }
    })

    // borrar: quien lo escribio, o un propietario o admin del servidor
    socket.on('mensaje:borrar', async (datos, responder) => {
      if (typeof responder !== 'function') return
      const { servidorId, canalId, mensajeId } = datos ?? {}
      if (!esId(servidorId) || !esId(canalId) || !esId(mensajeId)) return responder({ ok: false, error: 'datos-invalidos' })
      if (muyRapido()) return responder({ ok: false, error: 'muy-rapido' })

      try {
        if (!(await permisoTexto(servidorId, canalId))) return responder({ ok: false, error: 'sin-permiso' })
        const r = await mensajes.borrar({ servidorId, canalId, mensajeId, uid })
        if (r.error) return responder({ ok: false, error: r.error })
        io.to(`texto:${servidorId}/${canalId}`).emit('mensaje:borrado', { mensajeId, servidorId, canalId })
        responder({ ok: true })
      } catch (error) {
        registrarError('borrar el mensaje')(error)
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
