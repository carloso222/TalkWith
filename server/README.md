# Servidor de TalkWith (TW 05)

Servidor Node.js con Express y Socket.io. Hace tres cosas:

1. **Solo acepta clientes autenticados.** Al conectarse, el frontend manda su token de Firebase (`obtenerTokenSocket()` en `src/lib/firebase.ts`). El servidor lo valida con `firebase-admin` (`verifyIdToken`). Sin token, o con un token inválido, rechaza la conexión.
2. **Maneja las salas de voz (TW 12 y TW 14).** Lleva quién está en cada canal de voz, quién está silenciado o hablando, y guarda el lugar unos segundos a quien pierde la conexión.
3. **Guarda las sesiones de voz en Firestore (TW 17).** La primera persona que entra abre la sesión, las demás se agregan como participantes y, cuando la sala se queda vacía, se guarda la duración.

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
| `sala:participantes` | servidor | `{ servidorId, canalId, participantes }` |
| `servidor:llamadas` | servidor | `{ servidorId, llamadas: { canalId: participantes } }` |

Errores posibles: `sin-token`, `token-invalido` (al conectar), `sin-permiso`, `datos-invalidos` y `error-servidor`.

## Pruebas

```bash
npm test
```

Prueban el servidor sin Firebase: el token y los permisos se reemplazan por funciones falsas.

## Pendiente

- Mensajes de texto por Socket.io (TW 09) y audio entre personas con WebRTC (TW 13). Este servidor ya trae la autenticación y las salas que esos tickets necesitan.
- Las salas viven en memoria: si el servidor se reinicia, las sesiones abiertas se quedan sin `fin`.
