import { McpServer } from "@modelcontextprotocol/sdk/server/mcp"
import z from "zod"

export function registerCreateProject(server: McpServer) {
    server.registerTool(
        "testtool", // Titulo de la herramienta
        {
            description: "testool", // descripción de la herramienta
            inputSchema: {
                city: z.string().describe("Name of the city to fetch weather for"), // Parametro de entrada para la herramienta
            },
        },
        // Implementación de la herramienta lo que se hace con la información de entrada
        async ({ city }) => {
            return {
                content: [
                    {
                        type: "text",
                        text: `The weather in ${city} is jd salcedo sanchez.`
                    }
                ]
            }
        }
    )
}