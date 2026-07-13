# Mobile App MCP

Servidor MCP (Model Context Protocol) para la creación y configuración de proyectos de aplicaciones móviles con Expo y React Native, directamente desde Claude.

---

## ¿Qué es esto?

**Mobile App MCP** es un servidor que expone herramientas MCP para que Claude pueda crear y configurar proyectos de apps móviles de forma automatizada. En lugar de ejecutar comandos manualmente, simplemente le pides a Claude que cree tu proyecto y él se encarga de todo. Te pregunta lo que sea necesario para llevar a cabo tu proyecto.

El servidor mantiene un archivo de **contexto por proyecto** (`.mcp-context.json`) que registra todo lo que se ha configurado, de modo que Claude puede retomar el trabajo entre sesiones sin perder el hilo.

---

## Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `init-project` | Orquestador: guía la conversación paso a paso para armar un proyecto de principio a fin |
| `read-project` | Lee el estado actual de un proyecto (tema, routing, layouts, screens, componentes, storage, auth) |
| `create-project` | Crea un nuevo proyecto Expo con la plantilla `blank` |
| `select-design` | Selecciona un template de diseño y genera el archivo `styles.js` |
| `config-routing` | Instala `expo-router` y configura la navegación base |
| `create-layout` | Crea un nuevo grupo de layout (`stack` o `tabs`) siguiendo las convenciones de Expo Router |
| `create-screen` | Crea una nueva screen `.jsx` dentro de `app/` |
| `create-component` | Crea componentes básicos de UI conectados a los estilos definidos |
| `configure-storage` | Instala dependencias y configura la persistencia de datos |
| `configure-auth` | Configura autenticación email/password (solo con storage Supabase) |

### `read-project`

Lee `.mcp-context.json` y devuelve el estado completo del proyecto. **Claude debe llamarla antes de modificar o extender un proyecto existente.**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `project_name` | `string` | Sí | Nombre del proyecto |
| `output_dir` | `string` | No | Directorio base (por defecto: `./projects`) |

### `create-project`

Crea un proyecto React Native con Expo e inicializa su archivo de contexto.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | `string` | Sí | Nombre del proyecto |
| `output_dir` | `string` | No | Directorio de salida (por defecto: `./projects`) |

**Ejemplo de uso en Claude:**
> *"Crea un proyecto llamado `my-app` en la carpeta `~/dev`"*

### `select-design`

Genera `styles.js` con una paleta de colores. Estilos disponibles: `lightblue`, `dark`, `purple`, `green`.

### `config-routing`

Instala `expo-router` y dependencias asociadas, crea la carpeta `app/` con `index.jsx` y `_layout.jsx`, y ajusta `package.json` y `app.json`.

### `create-layout`

Crea un grupo de layout `(nombre)` con su `_layout.jsx` (navegador `stack` o `tabs`) y un `index.jsx` de entrada. Soporta anidamiento con `parent_layout`.

### `create-screen`

Crea una screen `.jsx`. Puede ubicarla dentro de un grupo de layout existente mediante `parent_layout`.

### `create-component`

Genera un componente de UI (`button`, `input`, `text`, `card`, `badge`, `divider`, `avatar`) en `components/`. Requiere que se haya aplicado un tema con `select-design`.

### `configure-storage`

Configura la persistencia. Genera `storage/config.js` y `hooks/useStorage.js`.

| Provider | Descripción |
|---|---|
| `supabase` | BaaS en la nube (requiere el MCP server de Supabase conectado) |
| `asyncstorage` | Almacenamiento local clave-valor |
| `sqlite` | Base de datos local relacional (`expo-sqlite`) |

### `configure-auth`

Configura autenticación email/password sobre Supabase. Genera el hook `useAuth` (`AuthProvider` + contexto), un grupo `(auth)` con pantallas de login y registro, y reescribe el `_layout.jsx` raíz para proteger las rutas.

> **Requiere** que el proyecto tenga routing configurado y storage con provider `supabase`. Se rehúsa a ejecutar con `asyncstorage` o `sqlite`.

---

## Sistema de contexto

Cada proyecto creado con este MCP contiene un archivo `.mcp-context.json` en su raíz que actúa como memoria persistente. Se actualiza automáticamente tras cada herramienta que modifica el proyecto y registra:

- Tema seleccionado
- Estado del routing
- Layouts y screens creados (con su ruta y grupo)
- Componentes generados
- Provider de storage configurado
- Si la autenticación está configurada

Claude usa `read-project` para leer este estado antes de continuar trabajando, lo que permite retomar un proyecto en cualquier momento sin perder coherencia.

### Persistencia ante timeouts

Algunas herramientas ejecutan instalaciones de paquetes que pueden tardar más que el *timeout* del cliente MCP. Cuando el cliente corta la petición **mata el handler**: cualquier código que iba después del paso largo no se ejecuta. Las herramientas están diseñadas para que esto no deje el proyecto en un estado irrecuperable.

**Patrón general — escribir primero, instalar de último** (`config-routing`, `configure-storage`):

1. Se generan los archivos (screens, layouts, config, etc.) y se actualiza `.mcp-context.json`.
2. La instalación de paquetes (`npm install` / `npx expo install`) se ejecuta como **último** paso.

Así, si el cliente corta durante la instalación, los archivos y el contexto ya quedaron en disco; solo faltaría reinstalar los paquetes:

```bash
cd projects/<tu-proyecto>
npm install        # o: npx expo install
```

**`create-project` es reanudable.** Aquí el paso largo es el propio scaffold de Expo, que ocurre *antes* de poder escribir el contexto, así que "instalar de último" no basta. En su lugar:

1. Genera el scaffold con `create-expo-app --template blank --no-install` (rápido, sin instalar).
2. Escribe metadata + `.mcp-context.json`.
3. Instala dependencias (`npm install`) como último paso.

Si el cliente corta durante el scaffold o el install, el proyecto queda a medias (sin `.mcp-context.json`). **Basta con volver a llamar `create-project` con el mismo nombre**: detecta el scaffold existente, se salta `create-expo-app` y completa lo que falte (contexto + instalación). Un proyecto solo se considera "ya existente" cuando tiene su `.mcp-context.json`.

---

## Instalación

### Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

### Pasos

```bash
# 1. Clona el repositorio
git clone <url-del-repo>
cd mobile-app-mcp

# 2. Instala las dependencias
npm install
```

> El servidor se ejecuta directamente con `tsx` (ver script `start`), no requiere paso de compilación.

---

## Configuración en Claude Desktop

Agrega el servidor a tu archivo de configuración de Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mobile-app-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/ruta/absoluta/al/proyecto/mobile-app-mcp/src/main.ts"
        ]
    }
  }
}
```

> Reemplaza `/ruta/absoluta/al/proyecto` con la ruta real donde clonaste el repositorio.

Además, si se quiere hacer uso de un BaaS (Supabase, necesario para `configure-storage` con provider `supabase` y para `configure-auth`) es necesario conectar el MCP server de Supabase.

```json
"supabase": {
  "command": "npx",
  "args": [
    "-y",
    "@supabase/mcp-server-supabase@latest"
  ],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_tu_token"
  }
}
```
> Reemplaza `sbp_tu_token` con un accessToken de tu cuenta.

Se recomienda ir a https://supabase.com/docs/guides/ai-tools/mcp para ver la guía de configuración.

---

## Estructura del proyecto

```
mobile-app-mcp/
├── src/
│   ├── main.ts                   # Punto de entrada del servidor MCP
│   ├── tools/
│   │   ├── index.ts              # Registro de todas las herramientas
│   │   ├── init-project.ts       # Orquestador de la conversación
│   │   ├── read-project.ts       # Lectura del estado del proyecto
│   │   ├── create-project.ts     # Creación de proyectos Expo
│   │   ├── select-design.ts      # Selección de tema / styles.js
│   │   ├── config-routing.ts     # Configuración de expo-router
│   │   ├── create-layout.ts      # Grupos de layout
│   │   ├── create-screen.ts      # Screens
│   │   ├── create-components.ts  # Componentes de UI
│   │   ├── configure-storage.ts  # Persistencia de datos
│   │   └── configure-auth.ts     # Autenticación (Supabase)
│   ├── templates/
│   │   ├── createScreen.ts        # Template de screen
│   │   ├── createLayout.ts        # Template de layout
│   │   ├── components.ts          # Templates de componentes
│   │   ├── themes.ts              # Paletas de color
│   │   ├── storage.ts            # Templates de storage
│   │   ├── auth.ts               # Templates de autenticación
│   │   └── tooltemplate.ts        # Plantilla para nuevas tools
│   └── utils/
│       ├── context.ts            # Lectura/escritura del contexto del proyecto
│       ├── paths.ts              # Resolución del directorio base de proyectos
│       └── init-project.md        # Prompt guía del orquestador
├── package.json
└── tsconfig.json
```

---

## Desarrollo

```bash
# Ejecutar el servidor MCP (modo desarrollo, vía tsx)
npm start
```

---

## Cómo agregar nuevas herramientas

1. Crea un archivo en `src/tools/`, por ejemplo `src/tools/mi-herramienta.ts`
2. Implementa y exporta la función `registerMiHerramienta(server: McpServer)`
3. Impórtala y regístrala en `src/tools/index.ts`

```typescript
// src/tools/index.ts
import { registerMiHerramienta } from "./mi-herramienta.js";

export function registerTools(server: McpServer) {
    // ...herramientas existentes
    registerMiHerramienta(server); // 👈 agrega aquí
}
```

> Si la herramienta modifica el proyecto, recuerda actualizar `.mcp-context.json` con `updateContext()` de `utils/context.ts`, y añadir el campo correspondiente al tipo `ProjectContext` si es necesario. Cualquier campo nuevo debe reflejarse también en `read-project`.

---

## Hoja de ruta

El objetivo es que este MCP acompañe todo el ciclo de vida de una app móvil: desde la idea hasta las funcionalidades nativas. Cada fase agrega una capa de capacidad sobre la anterior.

**Leyenda:** ✅ hecho · 🚧 en progreso · ⬜ pendiente

---

### Fase 0 — Memoria del proyecto ✅

**Goal:** que la IA no pierda el hilo entre sesiones de trabajo.

Implementado como un archivo `.mcp-context.json` por proyecto (en lugar de un `CONTEXT.md`), que se actualiza automáticamente tras cada acción relevante.

- ✅ `create-project` inicializa el contexto
- ✅ Cada tool actualiza el contexto tras completarse (`utils/context.ts`)
- ✅ `read-project` permite a la IA leer el estado antes de continuar

> La IA debe llamar `read-project` al inicio de cada sesión sobre un proyecto existente.

---

### Fase 1 — Persistencia de datos ✅ / 🚧

**Goal:** que la IA pueda preguntarle al usuario cómo quiere manejar sus datos y configurar todo automáticamente.

```
Opciones soportadas:
  BaaS   →  Supabase
  Local  →  AsyncStorage / SQLite (expo-sqlite)
```

- ✅ `configure-storage` — instala dependencias y genera config (`.js`) según la elección
- ⬜ `create-model` — genera un modelo de datos para una entidad y su hook CRUD específico

---

### Fase 2 — Envoltorios de aplicación ✅ / 🚧

**Goal:** configurar la estructura base de navegación y providers de la app.

- ✅ `config-routing` — instala `expo-router` y escribe el layout base
- ✅ `configure-auth` — genera `AuthProvider` + `useAuth` y protege rutas (cubre el provider de auth)
- ⬜ `create-provider` — genérico para envolver otros contextos globales (theme, storage)

---

### Fase 3 — Abstracción de la aplicación *(Skills + MCP)* 🚧

**Goal:** que la IA entienda *qué* se quiere construir antes de escribir código, y mantenga coherencia entre sesiones.

**Skills (prompts estructurados):**
- ⬜ `app-planner` — extrae pantallas, entidades, flujos y reglas de negocio desde lenguaje natural
- ⬜ `component-architect` — decide qué componentes crear y cómo se relacionan

**Tools MCP:**
- ✅ `create-screen` — genera una pantalla `.jsx`
- ✅ `create-component` — genera un componente reutilizable
- ✅ `create-layout` — genera un grupo de layout
- ⬜ Plantillas de screen con lógica real por tipo (`list`, `detail`, `form`, `dashboard`)

---

### Fase 4 — Funcionalidades nativas ⬜

**Goal:** acceso guiado a las APIs nativas del dispositivo con la configuración correcta de permisos.

Cada tool instala el paquete Expo correspondiente, agrega los permisos necesarios en `app.json` y genera un hook reutilizable listo para importar.

| Tool | Funcionalidad | Paquete |
|---|---|---|
| `native-camera` | Cámara y galería | `expo-camera`, `expo-image-picker` |
| `native-location` | GPS y geolocalización | `expo-location` |
| `native-notifications` | Push notifications | `expo-notifications` |
| `native-sensors` | Acelerómetro, giroscopio | `expo-sensors` |
| `native-biometrics` | Face ID / huella dactilar | `expo-local-authentication` |
| `native-filesystem` | Lectura/escritura de archivos | `expo-file-system` |

Cada tool genera automáticamente:
1. El hook (`useCamera.js`, `useLocation.js`, etc.)
2. La solicitud de permisos con manejo de errores
3. Un ejemplo de uso listo para copiar
