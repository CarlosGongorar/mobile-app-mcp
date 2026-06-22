import { McpServer } from "@modelcontextprotocol/sdk/server/mcp"
import z from "zod"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs/promises"
import { writeContext } from "../utils/context.js"

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
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            // Sube dos niveles: src/tools/ -> src/ -> raíz del proyecto
            const baseDir = output_dir ?? path.join(__dirname, "../../projects");
            const projectDir = path.join(baseDir, name);

            try {
                // Verificar si el proyecto ya existe
                const exists = await fs.access(projectDir).then(() => true).catch(() => false);
                if (exists) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Project ${name} already exists in ${baseDir}.`
                            }
                        ]
                    }
                }
                // Crear el proyecto
                await fs.mkdir(projectDir, { recursive: true });
                let command = `npx create-expo-app@latest ${name} --template blank`;

                // Ejecutar el comando para crear el proyecto
                const { stdout, stderr } = await execAsync(command, { cwd: baseDir, timeout: 120_000 });

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
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: [
                                ` Proyecto "${name}" creado exitosamente!`,
                                ` Ubicación: ${projectDir}`,
                                ` Framework: Expo`,
                                ``,
                                `Próximos pasos:`,
                                ` cd ${projectDir}`,
                                ` npm start`,
                                ``,
                                stdout ? `📝 Output:\n${stdout}` : "",
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