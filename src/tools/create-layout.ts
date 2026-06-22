import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { createLayoutTemplate } from "../templates/createLayout.js";
import { createScreenTemplate } from "../templates/createScreen.js";
import { readContext, updateContext } from "../utils/context.js";
import { DEFAULT_PROJECTS_DIR } from "../utils/paths.js";

export function registerCreateLayout(server: McpServer) {
    server.registerTool(
        "create-layout",
        {
            description:
                "Creates a new layout group folder inside the app directory. " +
                "The folder is named (layoutName) following Expo Router conventions. " +
                "Generates a _layout.jsx (Stack or Tabs) and an index.jsx as entry screen. " +
                "Use parent_layout to nest the group inside an existing layout group " +
                "(e.g. 'tabs' to create app/(tabs)/(layoutName)).",
            inputSchema: CreateLayoutSchema,
        },
        async ({ layoutName, layoutType, project_name, output_dir, parent_layout }) => {
            const baseDir = output_dir ?? DEFAULT_PROJECTS_DIR;
            const projectDir = path.join(baseDir, project_name);
            const appDir = path.join(projectDir, "app");

            try {
                // Verificar si el proyecto existe
                const projectExists = await fs.access(projectDir).then(() => true).catch(() => false);
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

                // Resolver directorio padre si existe parent_layout
                let parentDir = appDir;

                if (parent_layout) {
                    // Soporta rutas compuestas: "tabs/profile" -> "(tabs)/(profile)"
                    const segments = parent_layout.split("/").map((seg) => {
                        return seg.startsWith("(") ? seg : `(${seg})`;
                    });
                    parentDir = path.join(appDir, ...segments);

                    const parentExists = await fs.access(parentDir).then(() => true).catch(() => false);
                    if (!parentExists) {
                        return {
                            content: [{
                                type: "text",
                                text: `The parent layout group "${segments.join("/")}" does not exist inside app/. Create it first with create-layout.`,
                            }],
                        };
                    }
                }

                // El nuevo grupo siempre va entre paréntesis: (layoutName)
                const groupFolderName = `(${layoutName.toLowerCase()})`;
                const groupDir = path.join(parentDir, groupFolderName);

                // Evitar duplicados
                const groupExists = await fs.access(groupDir).then(() => true).catch(() => false);
                if (groupExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `Layout group "${groupFolderName}" already exists at "${path.relative(projectDir, groupDir)}".`,
                        }],
                    };
                }

                // Crear carpeta del grupo
                await fs.mkdir(groupDir, { recursive: true });

                // Crear _layout.jsx usando el template compartido
                // layoutType "tabs" -> "tab", "stack" -> "stack"
                const templateType = layoutType === "tabs" ? "tab" : "stack";
                await fs.writeFile(path.join(groupDir, "_layout.jsx"),createLayoutTemplate(layoutName, templateType),"utf-8");

                // Crear index.jsx como pantalla de entrada del grupo
                await fs.writeFile(path.join(groupDir, "index.jsx"),createScreenTemplate(layoutName),"utf-8");

                const relativeGroup = path.relative(projectDir, groupDir);

                const ctx = await readContext(projectDir);
                if (ctx) {
                    await updateContext(projectDir, {
                        layouts: [
                            ...ctx.layouts,
                            {
                                name: layoutName,
                                type: layoutType,
                                path: relativeGroup,
                            },
                        ],
                        screens: [
                            ...ctx.screens,
                            {
                                name: layoutName,
                                file: "index.jsx",
                                path: `${relativeGroup}/index.jsx`,
                                layout: layoutName.toLowerCase(),
                            },
                        ],
                    });
                }

                return {
                    content: [{
                        type: "text",
                        text: [
                            `Layout group "${groupFolderName}" created successfully!`,
                            `Location: ${relativeGroup}/`,
                            `   ├── _layout.jsx  (${layoutType === "tabs" ? "Tabs" : "Stack"} navigator)`,
                            `   └── index.jsx    (entry screen)`,
                            parent_layout ? `Nested inside: ${parent_layout}` : `Inside: app/`,
                        ].join("\n"),
                    }],
                };

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error creating layout "${layoutName}": ${errMsg}`,
                    }],
                };
            }
        }
    );
}

const CreateLayoutSchema = {
    layoutName: z.string().describe("PascalCase name for the layout group. Used as the component name and to derive the folder name. " +"E.g. 'Tabs' -> folder (tabs), 'Auth' -> folder (auth), 'Profile' -> folder (profile)."),
    layoutType: z.enum(["stack", "tabs"]).describe("Type of navigator for the _layout.jsx. " +"'stack' uses expo-router Stack, 'tabs' uses expo-router Tabs."),
    project_name: z.string().describe("Name of the existing project where the layout will be created."),
    output_dir: z.string().optional().describe("Base directory where the project lives. Defaults to ./projects."),
    parent_layout: z.string().optional().describe("Parent layout group where this new group will be nested, without parentheses. " +"Supports nested paths separated by '/'. " +"E.g. 'tabs' to create app/(tabs)/(layoutName), 'tabs/profile' to go deeper. " +"If omitted, the group is created directly inside app/."
    ),
};