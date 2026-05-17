import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";

export function registerAddScreen(server: McpServer) {
    server.registerTool(
        "add-screen",
        {
            description: "This tools allows you to add a new screen to your React Native project",
            inputSchema: AddScreenSchema // Esquema de validación de la entrada de la herramienta
        },
        async ({ project_name, output_dir, screen_name }) => {
            
            return {
                content: [
                    {
                        type: "text",
                        text: ""
                    }
                ]
            }
        }
    )
}

// Esquema de entrada
const AddScreenSchema = {
    project_name: z.string().describe("Name of the existing project where the component will be created"),
    output_dir: z.string().optional().describe("Base directory where the project lives, default ./projects"),
    screen_name: z.string().describe("Name of the new screen to be created"),
}