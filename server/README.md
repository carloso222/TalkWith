# Servidor de TalkWith (TW 05)

Servidor Node.js con Express y Socket.io. Hace cinco cosas:

1. **Solo acepta clientes autenticados.** Al conectarse, el frontend manda su token de Firebase (`obtenerTokenSocket()` en `src/lib/firebase.ts`). El servidor lo valida con `firebase-admin` (`verifyIdToken`). Sin token, o con un token inválido, rechaza la conexión.
2. **Maneja las salas de voz (TW 12 y TW 14).** Lleva quién está en cada canal de voz, quién está silenciado o hablando, y guarda el lugar unos segundos a quien pierde la conexión.
3. **Guarda las sesiones de voz en Firestore (TW 17).** La primera persona que entra abre la sesión, las demás se agregan como participantes y, cuando la sala se queda vacía, se guarda la duración.
4. **Recibe y reparte los mensajes de texto (TW 09).** Guarda cada mensaje en Firestore con la hora del servidor (así todos los ven en el mismo orden) y se lo manda a quienes tienen abierto el canal. Frena a quien manda más de 10 mensajes en 10 segundos.
5. **Pasa la señalización de WebRTC (TW 13).** El audio va directo entre navegadores; el servidor solo reenvía la oferta, la respuesta y los candidatos entre dos personas de la misma sala.

Antes de dejar entrar a una sala, revisa en Firestore que la persona sea miembro del servidor y que el canal sea de voz.

## Correrlo en local

```bash
# 1. en la raiz del proyecto, los emuladores de Firebase
npm run emuladores

# 2. en otra terminal
cd server
npm install
cp .env.example .env   # o crea el .env con las variables de abajo
npm run dev
```

El frontend se conecta a `VITE_SOCKET_URL` (por defecto `http://localhost:3000`).

## Variables de entorno

| Variable | Para qué | Ejemplo |
|---|---|---|
| `PORT` | Puerto (Render lo pone solo) | `3000` |
| `CLIENT_URL` | Dominios del frontend que pueden conectarse, separados por coma | `http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Id del proyecto de Firebase | `demo-talkwith` |
| `FIREBASE_SERVICE_ACCOUNT` | **Solo producción.** JSON de la cuenta de servicio en una línea (Firebase > Configuración > Cuentas de servicio). Nunca se sube al repo | `{"type":"service_account",...}` |
| `FIRESTORE_EMULATOR_HOST` | Solo con emuladores | `127.0.0.1:8080` |
| `FIREBASE_AUTH_EMULATOR_HOST` | Solo con emuladores | `127.0.0.1:9099` |

Si no hay cuenta de servicio ni emuladores, el servidor no arranca y lo dice en la consola.

## Eventos de Socket.io

| Evento | Quién lo manda | Datos |
|---|---|---|
| `sala:unirse` | cliente | `{ servidorId, canalId }` → responde `{ ok, sesionId, inicio, participantes }` o `{ ok: false, error }` |
| `sala:salir` | cliente | — |
| `sala:estado` | cliente | `{ silenciado, hablando }` |
| `servidor:ver` | cliente | `{ servidorId }` → responde `{ ok, llamadas }` |
| `canal:entrar` | cliente | `{ servidorId, canalId }` (canal de texto) → responde `{ ok }` |
| `canal:salir` | cliente | — |
| `mensaje:enviar` | cliente | `{ servidorId, canalId, contenido }` → responde `{ ok, mensaje }` |
| `mensaje:editar` | cliente | `{ servidorId, canalId, mensajeId, contenido }` → responde `{ ok, mensaje }`. Solo el autor |
| `mensaje:borrar` | cliente | `{ servidorId, canalId, mensajeId }` → responde `{ ok }`. El autor, o un propietario o admin |
| `rtc:senal` | cliente | `{ para: uid, datos: { tipo: 'oferta' \| 'respuesta' \| 'candidato', ... } }` |
| `grabacion:solicitar` | cliente | — → responde `{ ok, grabacion }`. Quien pide cuenta como aceptado |
| `grabacion:responder` | cliente | `{ id, acepta }` → responde `{ ok }`. Si alguien rechaza, se cancela para todos |
| `grabacion:cancelar` | cliente | — → `{ ok }`. Solo quien la pidió, mientras se espera |
| `grabacion:detener` | cliente | — → `{ ok }`. Cualquiera en la llamada |
| `mensaje:nuevo` | servidor | `{ mensajeId, servidorId, canalId, autorUid, contenido, creadoMs }` |
| `mensaje:editado` | servidor | `{ mensajeId, servidorId, canalId, contenido, editadoMs }` |
| `mensaje:borrado` | servidor | `{ mensajeId, servidorId, canalId }` |
| `rtc:senal` | servidor | `{ de: uid, conexion, datos }` |
| `sala:participantes` | servidor | `{ servidorId, canalId, participantes }` |
| `servidor:llamadas` | servidor | `{ servidorId, llamadas: { canalId: participantes } }` |
| `grabacion:estado` | servidor | `{ servidorId, canalId, grabacion: { id, fase: 'solicitada' \| 'grabando', solicitante, estados, inicio } \| null, motivo?, por? }` |

**Grabación (TW 20).** Empieza solo cuando todas las personas de la sala aceptan. Termina si alguien rechaza, si la detiene cualquiera, si sale quien la pidió o si entra alguien nuevo (no dio su consentimiento). Al terminar, `motivo` es `rechazada`, `cancelada`, `detenida`, `salio` o `nuevo-participante`. Cada respuesta queda en `sesiones/{id}/consentimientos/{uid}`. `sala:unirse` también regresa `grabacion`.

Errores posibles: `sin-token`, `token-invalido` (al conectar), `sin-permiso`, `datos-invalidos`, `mensaje-invalido`, `no-existe` (editar o borrar un mensaje que ya no está), `sin-sala`, `grabacion-en-curso`, `sin-solicitud`, `sin-grabacion`, `muy-rapido` y `error-servidor`. Enviar, editar y borrar comparten el límite de 10 en 10 segundos.

## Audio (WebRTC)

Cada par de personas tiene su propia conexión directa (malla). Para que nunca ofrezcan los dos a la vez, siempre ofrece quien tiene el uid "mayor". Cuando alguien vuelve a entrar a la sala cambia su número de `conexion`, y la conexión de audio se rehace.

Para encontrar el camino entre navegadores se usan los servidores STUN gratuitos de Google. En algunas redes (por ejemplo, la de una escuela) hace falta un servidor TURN; se configura en el frontend con `VITE_TURN_URL`, `VITE_TURN_USUARIO` y `VITE_TURN_CLAVE`.

La malla funciona bien con pocas personas (hasta unas 5 por sala).

## Pruebas

```bash
npm test
```

Prueban el servidor sin Firebase: el token y los permisos se reemplazan por funciones falsas.

## Pendiente

- Presencia y "escribiendo…" en canales de texto (TW 10).
- Las salas viven en memoria: si el servidor se reinicia, las sesiones abiertas se quedan sin `fin`.
