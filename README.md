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

Para entrar a la app, pulsa **Continuar con Google** en `/login`. Es un inicio de sesión simulado.

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
  store/         Zustand: authStore (sesión simulada), uiStore (toasts y confirmaciones)
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
| Servicios | `src/services`: devuelven datos de `mocks/` en una Promise. En la siguiente entrega solo cambia su contenido por Firebase y Socket.io |
| Guardias / Middlewares | `src/guards`: `ProtectedRoute` (sesión), `GuestRoute` (ya hay sesión), `MemberGuard` (pertenece al servidor) y `RoleGuard` (propietario o admin) |
| Rutas | `src/routes/AppRouter.tsx` con React Router |
| Mensajes de confirmación | `useUiStore().confirm({...})`. Nunca borra nada: al aceptar solo se muestra un toast |
| Notificaciones | `useUiStore().notify('exito' \| 'info' \| 'error', titulo, descripcion)` |

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

**Modo demo:** el botón del matraz, abajo en la barra de servidores, permite simular el rol *miembro* para mostrar que `RoleGuard` bloquea la configuración y lanzar ejemplos de notificaciones.

## Reparto de pantallas

Cada página que todavía no está hecha muestra un aviso **"Por construir"** con su número de Figma y su responsable. Para construirla, reemplaza el `<Placeholder>` del archivo por la vista real.

| Responsable | Pantallas | Archivos |
|---|---|---|
| **Carlos** | ✅ 02–03 Login, ✅ 04 Registro, ✅ 18–20 Detalle de sesión, ✅ 22–23 Búsqueda, ✅ 28 Perfil y ✅ base del proyecto, rutas y guardias | `pages/auth/*`, `pages/history/DetalleSesion.tsx`, `pages/search/*`, `pages/account/*` |
| **Diego** | 01 Landing, 05 Inicio, 12–16 Canal de voz y grabación, 21 Grabaciones, 29 404 (base ✅) + kit de componentes y layout | `pages/public/*`, `pages/dashboard/*`, `pages/voice/*`, `pages/history/Grabaciones.tsx`, `components/ui/*`, `components/layout/*` |
| **Isaian** | 06 Tus servidores, 07–09 Crear servidor y toasts, 08 Unirse, 10–11 Canal de texto, 17 Historial, 24–27 Configuración | `pages/servers/*`, `pages/channels/CanalTexto.tsx`, `pages/history/Sesiones.tsx`, `pages/settings/*` |

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
