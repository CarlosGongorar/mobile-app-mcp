import { McpServer } from "@modelcontextprotocol/sdk/server/mcp"
import z from "zod"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs/promises"
import { writeContext } from "../utils/context.js"
import { DEFAULT_PROJECTS_DIR } from "../utils/paths.js"

const execAsync = promisify(exec)

export function registerCreateProject(server: McpServer) {
    server.registerTool(
        "create-project", // Titulo de la herramienta
        {
            description: "Create a new project with Expo", // descripción de la herramienta
            inputSchema: CreateProjectSchema // Esquema de validación de la entrada de la herramienta
        },
        // Implementación de la herramienta lo que se hace con la información de entrada
        async ({ name, output_dir }) => {
            const baseDir = output_dir ?? DEFAULT_PROJECTS_DIR;
            const projectDir = path.join(baseDir, name);
            const contextPath = path.join(projectDir, ".mcp-context.json");
            const scaffoldMarker = path.join(projectDir, "package.json");

            const fileExists = (p: string) => fs.access(p).then(() => true).catch(() => false);

            try {
                // Un proyecto se considera "completo" solo si ya tiene su contexto.
                // (Un cliente MCP puede cortar por timeout durante los pasos largos y
                //  matar el handler; en ese caso el scaffold puede quedar en disco sin
                //  contexto. Esta tool es reanudable: detecta ese estado y lo completa.)
                if (await fileExists(contextPath)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Project ${name} already exists in ${baseDir}.`
                            }
                        ]
                    }
                }

                await fs.mkdir(projectDir, { recursive: true });

                // 1. Scaffold rápido SIN instalar dependencias (--no-install).
                //    Se salta si ya hay un scaffold a medias de un intento previo
                //    (create-expo-app rechazaría un directorio no vacío de todos modos).
                const resumed = await fileExists(scaffoldMarker);
                if (!resumed) {
                    const scaffoldCommand = `npx create-expo-app@latest ${name} --template blank --no-install`;
                    await execAsync(scaffoldCommand, { cwd: baseDir, timeout: 120_000 });
                }

                // 2. Escribir metadata + contexto ANTES del install pesado.
                //    Como esto va justo tras un paso rápido (o instantáneo al reanudar),
                //    el contexto queda persistido aunque el install posterior se corte.
                const metadata = {
                    projectName: name,
                    createAt: new Date().toISOString(),
                    path: projectDir
                }

                await fs.writeFile(
                    path.join(projectDir, ".mcp-project.json"),
                    JSON.stringify(metadata)
                );

                await writeContext(projectDir, {
                    name,
                    createdAt: new Date().toISOString(),
                    outputDir: baseDir,
                    theme: null,
                    routingConfigured: false,
                    layouts: [],
                    screens: [],
                    components: [],
                    storage: null,
                    auth: false,
                });

                // 3. Instalar dependencias como último paso (el más lento).
                await execAsync(`npm install`, { cwd: projectDir, timeout: 120_000 });

                return {
                    content: [
                        {
                            type: "text",
                            text: [
                                resumed
                                    ? ` Proyecto "${name}" completado (se reanudó un scaffold previo).`
                                    : ` Proyecto "${name}" creado exitosamente!`,
                                ` Ubicación: ${projectDir}`,
                                ` Framework: Expo`,
                                ``,
                                `Próximos pasos:`,
                                ` cd ${projectDir}`,
                                ` npm start`,
                            ]
                                .filter(Boolean)
                                .join("\n")
                        }
                    ]
                }

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error creating project ${name}: ${errMsg}`
                        }
                    ]
                }
            }
        }
    )
}

const CreateProjectSchema = {
    name: z.string().min(1).describe("Name of the project to create"),
    output_dir: z.string().optional().describe("Directory where the project will be created, default ./projects")
}