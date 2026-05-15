import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";

export function registerTool(server: McpServer) {
    server.registerTool(
        "name", // Titulo de la herramienta
        {
            description: "description", // descripción de la herramienta
            inputSchema: CreateDesignSchema // Esquema de validación de la entrada de la herramienta
        },
        //Funcion que hace
        async ({}) => {
            //Retorno
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
const CreateDesignSchema = {
    name: z.string().describe("Name"),
}