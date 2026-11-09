# TalkWith

Plataforma de comunidades con canales de texto y voz, subtítulos en vivo, transcripción con búsqueda y grabación con consentimiento.

**Entrega de Avances 1 — Vistas del proyecto.** Solo interfaz: datos de ejemplo en el código y navegación con React Router. No hay peticiones a ninguna API.

- Diseño: [Figma — TalkWith Mockups](https://www.figma.com/design/Qzs5kauHqUQsE5qQSLn60H/TalkWith-%E2%80%94-Mockups--Copy-?node-id=1-2) (pantallas 01–29)
- Equipo: Diego Gómez, Isaian Ayala, Carlos Olmedo

## Cómo correrlo

Necesitas Node.js 20 o más reciente.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # revisa tipos y genera dist/
npm run lint
```

Las salas de voz necesitan el servidor de Socket.io de la carpeta `server/` (TW 05). Mira cómo correrlo en [server/README.md](server/README.md).

Para entrar a la app, ve a `/login` y pulsa **Continuar con Google**, o entra con correo y contraseña (o crea una cuenta con «Crea una»). Para usar correo en el proyecto real, el proveedor **Correo electrónico/contraseña** debe estar activado en Firebase Console > Authentication > Método de acceso.

## Tecnologías

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Zustand y lucide-react (los mismos iconos del Figma).

## Estructura

```
src/
  components/
    ui/          Button, Field, Modal, Avatar, Badge, Switch, Checkbox, Dropdown, Highlight, ServerIcon, Logo
    layout/      AppLayout, ServerBar, ChannelSidebar, TopBar, UserPanel, DemoPanel
    feedback/    ToastHost, ConfirmHost, Placeholder
  pages/         una carpeta por sección (auth, dashboard, channels, voice, history...)
  hooks/         "directivas": useAutoScroll, useClickOutside, useDebounce, useHotkey...
  services/      acceso a datos simulado (Promise + retardo, sin API)
  guards/        ProtectedRoute, GuestRoute, MemberGuard, RoleGuard, Can
  routes/        AppRouter.tsx (mapa de rutas ↔ pantallas del Figma)
  store/         Zustand: authStore (sesión de Firebase Auth), datosStore (caché de Firestore), uiStore (toasts y confirmaciones)
  types/         modelo de datos (sección 4.1 de la planeación)
  mocks/         datos de ejemplo con los mismos nombres del Figma
  lib/           rutas centralizadas (lib/routes.ts) y helper cn()
```

## Lo que pide la entrega y dónde está

La entrega usa términos de Angular. En React se cubren así:

| Pide la entrega | En este proyecto |
|---|---|
| Componentes | `src/components` y `src/pages` |
| Directivas | Hooks personalizados en `src/hooks` y el componente `<Can roles={[...]}>`, que muestra u oculta contenido según el rol (como un `*ngIf` de permisos) |
| Servicios | `src/services`: servidores, miembros, canales, invitaciones y sesiones de voz viven en Firestore; las salas de voz usan Socket.io (`server/`). El resto todavía devuelve datos de `mocks/` en una Promise |
| Guardias / Middlewares | `src/guards`: `ProtectedRoute` (sesión), `GuestRoute` (ya hay sesión), `MemberGuard` (pertenece al servidor) y `RoleGuard` (propietario o admin) |
| Rutas | `src/routes/AppRouter.tsx` con React Router |
| Mensajes de confirmación | `useUiStore().confirm({...})`. Nunca borra nada: al aceptar solo se muestra un toast |
| Notificaciones | `useUiStore().notify('exito' \| 'info' \| 'error', titulo, descripcion)` |

## Autenticación y permisos (Entrega 3)

### Proveedor elegido: Firebase Auth

Usamos **Firebase Auth** (la opción BaaS) con dos formas de entrar: **Google** y **correo y contraseña** (con correo de verificación y restablecimiento de contraseña).

Por qué:

- **Ya usamos Firebase.** Los datos viven en Firestore y sus reglas de seguridad entienden el token de Firebase Auth (`request.auth.uid`) sin que tengamos que escribir un backend de autenticación.
- **No guardamos contraseñas.** Firebase las guarda con hash (scrypt) y se encarga de la verificación de correo, el restablecimiento de contraseña y el bloqueo por demasiados intentos. Con una API propia tendríamos que hacer todo eso nosotros (bcrypt, emitir y renovar JWT, guardar sesiones).
- **Un solo token para todo.** El servidor de Socket.io (`server/`) valida el mismo token con `firebase-admin`, así que no hay dos sistemas de sesión.
- **Descartamos la API simulada** porque la entrega final necesita autenticación real.

### Cómo funciona la sesión

1. **Inicio de sesión.** `Login.tsx` llama a `src/services/authService.ts`, que usa Firebase Auth (`signInWithPopup` para Google, `signInWithEmailAndPassword` y `createUserWithEmailAndPassword` para correo).
2. **Token.** Firebase entrega un *ID token* (un JWT que dura una hora) y un *refresh token*. El SDK los guarda en el navegador y renueva el ID token solo antes de que venza.
3. **Estado de la app.** `src/lib/sesion.ts` escucha `onAuthStateChanged`. Cuando hay usuario, se asegura de que exista su perfil en `usuarios/{uid}`, lo guarda en `authStore` y abre las escuchas de Firestore. Cuando no hay usuario, `limpiarEstadoLocal()` vacía los stores, cierra las escuchas y desconecta el socket. La lógica de sesión vive solo en `authService`, `authStore` y `lib/sesion.ts`, no en los componentes.
4. **Recargar la página.** Firebase restaura la sesión guardada; mientras tanto `ProtectedRoute` muestra la pantalla de carga en lugar de mandar al login.
5. **Usuario actual.** El nombre y el avatar se ven en el panel de usuario (abajo a la izquierda) y en Perfil.
6. **Cerrar sesión.** `authStore.logout()` cierra la sesión en Firebase, se limpia el estado local y la app redirige a `/login`.
7. **Sesión expirada o inválida.** Si Firebase invalida la sesión (por ejemplo, la cuenta se deshabilitó o se revocó) o llega un 401, `onAuthStateChanged` avisa que ya no hay usuario. `lib/sesion.ts` revisa si la persona pulsó «Cerrar sesión» (`authStore.cerrandoSesion`); si no fue así, deja en `authStore.avisoLogin` el mensaje «Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión.». `ProtectedRoute` manda al login recordando la página, y el login muestra ese mensaje hasta el siguiente intento.

### Cómo viaja el token

Nunca se agrega el token a mano en cada llamada:

| Hacia | Cómo se manda | Quién lo valida |
|---|---|---|
| Firestore | El SDK de Firebase lo adjunta solo en cada lectura y escritura | Las reglas de `firestore.rules` (`request.auth.uid`) |
| Servidor de Socket.io | `src/lib/socket.ts` lo pide con `obtenerTokenSocket()` en cada conexión y reconexión (opción `auth` de socket.io) | `server/src/app.js` con `verifyIdToken` de `firebase-admin`; sin token o con uno inválido rechaza la conexión |

**Errores en un solo lugar.** `src/services/firestore/errores.ts` convierte los errores de Firestore en un `ApiError`: `unauthenticated` en **401** y `permission-denied` en **403**. `manejarError` (`src/services/errores.ts`) es el único lugar que los maneja:

| Estado | Qué pasa |
|---|---|
| **401** (sin sesión o token inválido) | Llama al manejador que registra `lib/sesion.ts`, que cierra la sesión. El login muestra «Tu sesión expiró…» (no hay toast) |
| **403** (sin permiso) y los demás | Toast con el mensaje del error, por ejemplo «No tienes permiso para hacer esto.» |

Al 401 se llega desde tres lados: los servicios de Firestore (`aApiError`), la escucha de membresías (`firestore/escuchas.ts`) y el socket. Cuando el servidor de Socket.io responde `token-invalido`, `lib/socket.ts` primero le pide a Firebase un token nuevo: si Firebase no puede renovarlo, la sesión ya no sirve y manda el 401 a `manejarError`; si lo renueva, reintenta una vez. Así un problema del servidor de voz no saca a nadie de su sesión.

**Llaves y secretos.** Ninguna llave se sube al repositorio. `.env.example` lista las variables del frontend sin valores reales, y [server/README.md](server/README.md) explica las del servidor. La cuenta de servicio de Firebase se guarda fuera del repo.

### Roles

Los roles son **por servidor**: la misma persona puede ser propietaria de un servidor y miembro de otro.

| Rol | Quién lo tiene |
|---|---|
| **Propietario** | Quien crea el servidor |
| **Admin** | Alguien a quien el propietario se lo asignó |
| **Miembro** | Quien entra con una invitación |

**De dónde sale el rol.** Del documento `servidores/{servidorId}/miembros/{uid}` en Firestore, que se lee con la sesión de la persona (hace el papel de un endpoint `/me` por servidor). No está escrito en el código ni se elige desde la interfaz.

La excepción es el **Modo demo** (botón del matraz), que permite simular el rol *miembro* para mostrar las guardias. Solo funciona con `npm run dev` (`import.meta.env.DEV`): en la versión compilada se ignora, y de todos modos las reglas de Firestore siguen usando el rol real.

### Qué puede hacer cada rol

| Acción | Propietario | Admin | Miembro |
|---|:-:|:-:|:-:|
| Ver el servidor, sus canales, mensajes e historial | ✅ | ✅ | ✅ |
| Enviar mensajes y entrar a las salas de voz | ✅ | ✅ | ✅ |
| Abrir la configuración del servidor (`/ajustes`) | ✅ | ✅ | ❌ (vista 403) |
| Editar nombre, descripción y privacidad del servidor | ✅ | ✅ | ❌ |
| **Crear, editar y borrar canales** (CRUD de la Entrega 2) | ✅ | ✅ | ❌ |
| Cambiar el rol de otra persona (admin o miembro) | ✅ | ❌ | ❌ |
| Retirar a alguien del servidor | ✅ (a cualquiera menos al propietario) | ✅ (solo a miembros) | ❌ |
| Salir del servidor | ❌ (es el dueño) | ✅ | ✅ |
| Eliminar el servidor | ✅ \* | ❌ | ❌ |

\* La pantalla de eliminar todavía es una demostración (no borra nada). En Firestore, solo el propietario puede borrar el servidor.

### Dónde se aplican los permisos

1. **Reglas de Firestore (`firestore.rules`).** Son la frontera real: aunque alguien se salte la interfaz, Firestore rechaza la escritura. Se prueban en el emulador con `npm run test:reglas`.
2. **Servicios.** `channelService` revisa el rol antes de escribir (`exigirGestor`) y `src/lib/permisos.ts` copia la matriz de las reglas para no intentar escrituras que se van a rechazar.
3. **Interfaz.**
   - `RoleGuard` protege `/ajustes` y muestra la vista 403 «Acceso denegado».
   - `<Can roles={['propietario', 'admin']} serverId={...}>` muestra u oculta botones (por ejemplo, el engrane de configuración y el «+» para crear canales). Hace el papel de una directiva estructural como `*appHasRole`, para no repetir `if` de rol en cada componente.

**Ocultar el botón no basta.** Si una acción llega a Firestore y se rechaza, el servicio lanza un `ApiError` 403 y la interfaz muestra «No tienes permiso para hacer esto.». Como las listas se leen en vivo desde Firestore, la pantalla nunca muestra un cambio que no se guardó.

### Guardias de ruta

| Guardia | Qué hace |
|---|---|
| `ProtectedRoute` | Sin sesión manda a `/login` y recuerda la ruta pedida; después de entrar regresa a ella |
| `GuestRoute` | Con sesión no deja volver a `/login` ni a `/registro` |
| `MemberGuard` | Solo deja abrir un servidor si eres miembro |
| `RoleGuard` | Solo propietario y admin abren la configuración; los demás ven la vista 403 |

## Rutas

| Ruta | Pantallas del Figma | Guardia |
|---|---|---|
| `/` | 01 Landing | — |
| `/login` | 02–03 Inicio de sesión | GuestRoute |
| `/registro` | 04 Registro | GuestRoute |
| `/app` | 05 Inicio | ProtectedRoute |
| `/app/servidores` | 06 Tus servidores | ProtectedRoute |
| `/app/servidores/nuevo` | 07 Crear servidor, 09 Notificaciones | ProtectedRoute |
| `/app/unirse` | 08 Unirse con invitación | ProtectedRoute |
| `/app/s/:serverId/c/:channelId` | 10–11 Canal de texto · 12–16 Canal de voz | MemberGuard |
| `/app/s/:serverId/sesiones` | 17 Historial de sesiones | MemberGuard |
| `/app/s/:serverId/sesiones/:sessionId` | 18–20 Detalle de sesión | MemberGuard |
| `/app/s/:serverId/grabaciones` | 21 Grabaciones | MemberGuard |
| `/app/s/:serverId/ajustes`, `/canales`, `/miembros`, `/eliminar` | 24–27 Configuración | RoleGuard |
| `/app/buscar` | 22–23 Búsqueda | ProtectedRoute |
| `/app/perfil` | 28 Perfil | ProtectedRoute |
| cualquier otra | 29 Página no encontrada | — |

Usa siempre los helpers de `src/lib/routes.ts` (`rutas.canal(serverId, canalId)`, etc.) en lugar de escribir las rutas a mano.

**Para la demo de la pantalla 08:** al crear un servidor, su enlace de invitación se copia al portapapeles; pégalo en *Unirse* desde otra cuenta. La pantalla 11 (reconectando) aparece sola si se pierde la conexión con el servidor de Socket.io.

**Modo demo (solo en `npm run dev`):** el botón del matraz, abajo en la barra de servidores, permite simular el rol *miembro* para mostrar que `RoleGuard` bloquea la configuración y lanzar ejemplos de notificaciones. En la versión compilada no cambia el rol.

## Reparto de pantallas

Cada página que todavía no está hecha muestra un aviso **"Por construir"** con su número de Figma y su responsable. Para construirla, reemplaza el `<Placeholder>` del archivo por la vista real.

| Responsable | Pantallas | Archivos |
|---|---|---|
| **Carlos** | ✅ 02–03 Login, ✅ 04 Registro, ✅ 18–20 Detalle de sesión, ✅ 22–23 Búsqueda, ✅ 28 Perfil y ✅ base del proyecto, rutas y guardias | `pages/auth/*`, `pages/history/DetalleSesion.tsx`, `pages/search/*`, `pages/account/*` |
| **Diego** | ✅ 01 Landing, ✅ 05 Inicio, ✅ 12–16 Canal de voz y grabación, ✅ 21 Grabaciones , 29 404 (base ✅) + kit de componentes y layout | `pages/public/*`, `pages/dashboard/*`, `pages/voice/*`, `pages/history/Grabaciones.tsx`, `components/ui/*`, `components/layout/*` |
| **Isaian** | ✅ 06 Tus servidores, ✅ 07–09 Crear servidor y toasts, ✅ 08 Unirse, ✅ 10–11 Canal de texto, ✅ 17 Historial, ✅ 24–27 Configuración | `pages/servers/*`, `pages/channels/CanalTexto.tsx`, `pages/history/Sesiones.tsx`, `pages/settings/*` |

## Reglas del equipo

1. **Nada de llamadas a API.** Los datos salen de `services/` (que leen `mocks/`). Si necesitas un dato nuevo, agrégalo en `mocks/data.ts` y expónlo desde un servicio.
2. **Las confirmaciones no borran nada.** Se pregunta con `confirm()` y, si aceptan, solo se muestra un toast.
3. **Usa los tokens del Figma.** Clases como `bg-panel`, `bg-raised`, `border-line`, `text-muted`, `bg-primary`, `text-voice` o `text-recording`, y la escala tipográfica `text-title`, `text-heading`, `text-body`, `text-small` y `text-caption`. Están definidos en `src/index.css`. Evita poner colores hex sueltos.
4. **Reutiliza los componentes base** (`Button`, `Field`, `Modal`, `Avatar`, `Badge`, `Switch`, `Checkbox`, `Dropdown`, `Highlight`) antes de crear otros nuevos.
5. **TypeScript estricto.** Antes de abrir un PR, `npm run build` y `npm run lint` deben pasar sin errores.

## Flujo de trabajo con Git

- `main`: solo lo que se entrega. No se sube nada directo.
- `develop`: integración.
- `feature/<pantalla>`: una rama por tarea, por ejemplo `feature/canal-texto` o `feature/landing`.

```bash
git checkout develop && git pull
git checkout -b feature/mi-pantalla
# ...trabajo...
git add . && git commit -m "Canal de texto: lista de mensajes y caja de escritura"
git push -u origin feature/mi-pantalla
# Abre un Pull Request hacia develop y pide revisión a otro integrante
```

Cada integrante toma las capturas de sus pantallas y escribe un párrafo por cada una para el documento de la entrega.
