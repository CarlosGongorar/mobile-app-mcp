import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { createScreenTemplate } from "../templates/createScreen.js";
import { readContext, updateContext } from "../utils/context.js";

// Convierte PascalCase a kebab-case para el nombre del archivo
// e.g. "SignUp" -> "sign-up", "UserProfile" -> "user-profile"
function toKebabCase(name: string): string {
    return name.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").toLowerCase();
}

export function registerCreateScreen(server: McpServer) {
    server.registerTool(
        "create-screen",
        {
            description: "Creates a new screen (.jsx) inside the app directory of the specified project. " + "Optionally place it inside an existing layout group by specifying parent_layout " + "(e.g. 'tabs', 'auth', 'tabs/profile'). " + "Use file_name to override the output file name (e.g. 'otp', 'sign-up', 'index').",
            inputSchema: CreateScreenSchema,
        },
        async ({ screenName, project_name, output_dir, parent_layout, file_name }) => {
            const baseDir = output_dir ?? "./projects";
            const projectDir = path.join(baseDir, project_name);
            const appDir = path.join(projectDir, "app");

            try {
                // Verificar si el proyecto existe
                const projectExists = await fs.access(projectDir)
                    .then(() => true)
                    .catch(() => false);

                if (!projectExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" does not exist in "${baseDir}". Create the project first with create-project.`,
                        }],
                    };
                }

                // Verificar si el routing fue configurado (existe carpeta app/)
                const routingConfigured = await fs.access(appDir).then(() => true).catch(() => false);
                if (!routingConfigured) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" does not have routing configured. Run configure-routing first.`,
                        }],
                    };
                }

                // Resolver el directorio destino según parent_layout
                // Soporta rutas compuestas: "tabs/profile" -> app/(tabs)/(profile)
                let targetDir = appDir;

                if (parent_layout) {
                    const segments = parent_layout.split("/").map((seg) => {
                        return seg.startsWith("(") ? seg : `(${seg})`;
                    });
                    targetDir = path.join(appDir, ...segments);

                    const layoutExists = await fs.access(targetDir).then(() => true).catch(() => false);

                    if (!layoutExists) {
                        return {
                            content: [{
                                type: "text",
                                text: `The layout group "${segments.join("/")}" does not exist inside app/. Create it first with create-layout.`,
                            }],
                        };
                    }
                }

                // Determinar nombre del archivo:
                // 1. file_name explícito (e.g. "otp", "sign-up", "index")
                // 2. kebab-case derivado de screenName
                const resolvedFileName = file_name? (file_name.endsWith(".jsx") ? file_name : `${file_name}.jsx`): `${toKebabCase(screenName)}.jsx`;

                const screenPath = path.join(targetDir, resolvedFileName);

                // Evitar sobreescribir archivos existentes
                const fileExists = await fs
                    .access(screenPath)
                    .then(() => true)
                    .catch(() => false);

                if (fileExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `Screen "${resolvedFileName}" already exists at "${path.relative(projectDir, screenPath)}".`,
                        }],
                    };
                }

                // Crear el archivo usando el template compartido
                await fs.writeFile(screenPath, createScreenTemplate(screenName), "utf-8");

                const relativePath = path.relative(projectDir, screenPath);

                const ctx = await readContext(projectDir);
                if (ctx) {
                    await updateContext(projectDir, {
                        screens: [
                            ...ctx.screens,
                            {
                                name: screenName,
                                file: resolvedFileName,
                                path: relativePath,
                                layout: parent_layout ?? null,
                            },
                        ],
                    });
                }

                return {
                    content: [{
                        type: "text",
                        text: [
                            `Screen "${screenName}" created successfully!`,
                            `File: ${relativePath}`,
                            parent_layout ? `Inside layout group: ${parent_layout}` : `Inside: app/`,
                        ].join("\n"),
                    }],
                };

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error creating screen "${screenName}": ${errMsg}`,
                    }],
                };
            }
        }
    );
}

const CreateScreenSchema = {
    screenName: z.string().describe("PascalCase name of the screen, used as the component name and to derive the file name. " + "E.g. 'Home', 'SignUp', 'UserProfile'."),
    project_name: z.string().describe("Name of the existing project where the screen will be created."),
    output_dir: z.string().optional().describe("Base directory where the project lives. Defaults to ./projects."),
    parent_layout: z.string().optional().describe("Layout group where this screen will live, without parentheses. " +"Supports nested paths separated by '/'. " +"E.g. 'tabs', 'auth', 'tabs/profile'. " +"The tool will look for the matching (group) folder inside app/."),
    file_name: z.string().optional().describe("Override the output file name. Defaults to kebab-case derived from screenName. " +"Useful for special names like 'otp', 'sign-up', 'index'. Extension .jsx is added automatically."),
};