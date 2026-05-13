import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { registerTools } from "./tools/index.js";

// 1. Crear ejemplificación de un servidor MCP

const server = new McpServer({
    name: "Mobile App MCP",
    version: "1.0.0"
});
const transport = new StdioServerTransport();
// 2. Registrar herramientas
registerTools(server);

// 3. Iniciar el servidor y escuchar conexiones
await server.connect(transport);
console.error("MCP Server is running...");