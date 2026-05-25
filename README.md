# Mobile App MCP

Servidor MCP (Model Context Protocol) para la creación y configuración de proyectos de aplicaciones móviles con Expo y React Native, directamente desde Claude.

---

## ¿Qué es esto?

**Mobile App MCP** es un servidor que expone herramientas MCP para que Claude pueda crear y configurar proyectos de apps móviles de forma automatizada. En lugar de ejecutar comandos manualmente, simplemente le pides a Claude que cree tu proyecto y él se encarga de todo. Te pregunta lo que sea necesario para llevar a cambo tu proyecto.

---

## Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `create-project` | Crea un nuevo proyecto Expo con la plantilla `blank` |
| `select-design` | Selecciona un template de diseño y genera el archivo `styles.js` |
| `create-screen` | Crea una nueva screen
| `config-routing` | Configura las navegaciones 
| `create-component` | Crea componentes basicos de UI junto con los estilos ya definidos
| `create-layout` | Crea un nuevo grupo de layout 

### `create-project`

Crea un proyecto React Native con Expo en el directorio especificado.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | `string` | Si (Recomendable) | Nombre del proyecto |
| `output_dir` | `string` | No | Directorio de salida (por defecto: `./projects`) |

**Ejemplo de uso en Claude:**
> *"Crea un proyecto llamado `my-app` en la carpeta `~/dev`"*

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

# 3. Compila el proyecto
npm run build
```

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

Ademas si se quiere hacer uso de un BaaS es necesario usar el MCP server de Supabase.

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

Se recomienda ir a https://supabase.com/docs/guides/ai-tools/mcp para ver la guia de configuración.

---

## Estructura del proyecto

```
mobile-app-mcp/
├── main.ts              # Punto de entrada del servidor MCP
├── tools/
│   ├── index.ts         # Registro de todas las herramientas
│   ├── create-project.ts  # Herramienta para crear proyectos Expo
│   └── select-design.ts   # Herramienta para seleccionar diseño
├── package.json
└── tsconfig.json
```

---

## Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar el servidor compilado
node dist/main.js
```

---

## Cómo agregar nuevas herramientas

1. Crea un archivo en `tools/`, por ejemplo `tools/mi-herramienta.ts`
2. Implementa y exporta la función `registerMiHerramienta(server: McpServer)`
3. Impórtala y regístrala en `tools/index.ts`

```typescript
// tools/index.ts
import { registerMiHerramienta } from "./mi-herramienta.js";

export function registerTools(server: McpServer) {
    registerCreateProject(server);
    registerSelectDesign(server);
    registerMiHerramienta(server); // 👈 agrega aquí
}
```

---

## Hoja de ruta

El objetivo es que este MCP sea capaz de acompañar todo el ciclo de vida de una app móvil: desde la idea hasta las funcionalidades nativas. Cada fase agrega una capa de capacidad sobre la anterior.
 
---
 
### Fase 1 — Persistencia de datos `create-storage`
 
**Goal:** que la IA pueda preguntarle al usuario cómo quiere manejar sus datos y configurar todo automáticamente.
 
La tool recibe la preferencia del usuario (base de datos en la nube o almacenamiento local) y genera la configuración, instala las dependencias necesarias y crea los archivos base listos para usar.
 
```
Opciones soportadas:
  BaaS  →  Firebase / Supabase
  Local  →  AsyncStorage / SQLite (expo-sqlite)
```
 
**Tools a implementar:**
- `configure-storage` — instala dependencias y genera config según la elección
- `create-model` — genera un modelo de datos tipado (TypeScript) para una entidad
---
 
### Fase 2 — Envoltorios de aplicación `configure-app-shell`
 
**Goal:** configurar la estructura base de navegación y providers de la app.
 
> **Nota de diseño:** esta fase es un caso especial. La IA (Claude) puede encargarse de generar el código de navegación y providers de forma directa, ya que es lógica de composición que no requiere acceso al sistema de archivos ni comandos del sistema. El MCP interviene solo para escribir los archivos generados en disco o instalar paquetes.
 
Flujo sugerido:
1. La IA decide la estructura según el tipo de app (tabs, stack, drawer)
2. `config-routing` instala `expo-router` y escribe el layout base
3. `create-provider` genera un `AppProvider` que envuelve contextos globales (auth, theme, storage)
---
 
### Fase 3 — Abstracción de la aplicación *(Skills + MCP)*
 
**Goal:** que la IA entienda *qué* se quiere construir antes de escribir código, y que pueda mantener coherencia entre sesiones.
 
Esta fase combina dos mecanismos:
 
**Skills (prompts estructurados):**
- `app-planner` — ayuda a la IA a extraer: pantallas, entidades, flujos de usuario y reglas de negocio desde una descripción en lenguaje natural
- `component-architect` — decide qué componentes crear, cómo nombrarlos y cómo se relacionan
**Tools MCP:**
- `create-screen` — genera una pantalla `.jsx` con su estructura base
- `create-component` — genera un componente reutilizable con sus props tipadas
- `create-layout` — genera un grupo de layout en `expo-router`
---
 
### Fase 4 — Generación de `CONTEXT.md` *(memoria del proyecto)*
 
**Goal:** que la IA no pierda el hilo entre sesiones de trabajo.
 
El MCP mantiene un archivo `CONTEXT.md` en la raíz del proyecto que actúa como memoria persistente. Cada vez que la IA realiza una acción significativa, el archivo se actualiza automáticamente.
 
```
context.md contiene:
  - Descripción del proyecto y objetivo
  - Pantallas creadas y su propósito
  - Componentes implementados
  - Modelo de datos y método de persistencia elegido
  - Dependencias instaladas y por qué
  - Historial de decisiones tomadas
  - Próximos pasos pendientes
```
 
**Tools a implementar:**
- `init-context` — crea el `CONTEXT.md` inicial al arrancar un proyecto
- `update-context` — llamada internamente por otras tools tras cada acción relevante
- `read-context` — permite a la IA leer el estado actual antes de continuar trabajando
> La IA debe llamar `read-context` al inicio de cada sesión y `update-context` al finalizar cada tarea.
 
---

### Fase 5 — Funcionalidades nativas

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
1. El hook (`useCamera.ts`, `useLocation.ts`, etc.)
2. La solicitud de permisos con manejo de errores
3. Un ejemplo de uso listo para copiar
---