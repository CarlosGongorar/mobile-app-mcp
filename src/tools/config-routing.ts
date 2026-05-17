import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { createScreenTemplate } from "../templates/createScreen.js";
import { createLayoutTemplate } from "../templates/createLayout.js";

const execAsync = promisify(exec)

export function registerConfigureRouting(server: McpServer) {
    server.registerTool(
        "configure-routing",
        {
            description: "This tool allows you to configure the best routing options and intall the necessary dependencies for your React Native project",
            inputSchema: ConfigureRoutingSchema
        },
        async ({ project_name, output_dir }) => {
            const baseDir = output_dir ?? "./projects";
            const projectDir = path.join(baseDir, project_name);
            const appDir = path.join(projectDir, "app");

            try {
                const projectExists = await fs.access(projectDir).then(() => true).catch(() => false);
                if (!projectExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" does not exist in "${baseDir}". Create the project first with create-project.`,
                        }],
                    };
                }

                // Instalar Dependencias
                let command = `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar`;
                const { stdout, stderr } = await execAsync(command, { cwd: projectDir });

                // Crear carpeta app
                await fs.mkdir(appDir, { recursive: true });

                // Aca debe crear un index.jsx con el template basico que debera recibir como argumento el nombre de la pantalla en este caso sera Main
                await fs.writeFile(path.join(appDir, "index.jsx"), createScreenTemplate("Main"), "utf-8");
                // Aca debe crear un _layout.jsx con el template basico que debera recibir como argumento el nombre del layout en este caso sera Root y el tipo de layout en este caso sera root
                await fs.writeFile(path.join(appDir, "_layout.jsx"), createLayoutTemplate("Root", "root"), "utf-8");

                // Modificar package.json — solo actualizar "main"
                const packageJsonPath = path.join(projectDir, "package.json");
                const packageJsonRaw = await fs.readFile(packageJsonPath, "utf-8");
                const packageJson = JSON.parse(packageJsonRaw);
                packageJson.main = "expo-router/entry";
                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");

                // Modificar app.json — merge profundo de "expo"
                const appJsonPath = path.join(projectDir, "app.json");
                const appJsonRaw = await fs.readFile(appJsonPath, "utf-8");
                const appJson = JSON.parse(appJsonRaw);
                appJson.expo = {
                    ...appJson.expo,
                    scheme: project_name.toLowerCase().replace(/\s+/g, "-"),
                    experiments: {
                        ...appJson.expo?.experiments,
                        typedRoutes: true,
                    },
                };
                await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2), "utf-8");

                let removeApp = `rm -rf App.js`;
                let removeIndex = `rm -rf index.js`;
                await execAsync(removeApp, { cwd: projectDir });
                await execAsync(removeIndex, { cwd: projectDir });
                
                return {
                    content: [{
                        type: "text",
                        text: [
                            `Routing configured for "${project_name}"`,
                            `Folder app/ created with index.jsx and _layout.jsx`,
                            `package.json → main: "expo-router/entry"`,
                            `app.json → scheme: "${project_name.toLowerCase()}", typedRoutes: true`,
                        ].filter(Boolean).join("\n")
                    }]
                };


            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error configuring routing: ${errMsg}`,
                    }],
                };
            }

        }
    )
}

// Esquema de entrada
const ConfigureRoutingSchema = {
    project_name: z.string().describe("Name of the existing project where the component will be created"),
    output_dir: z.string().optional().describe("Base directory where the project lives, default ./projects"),
}