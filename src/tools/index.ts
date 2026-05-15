import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { registerCreateProject } from "./create-project.js";
import { registerSelectDesign } from "./select-design.js";
// Aca vamos a ir añadiendo las herramientas que queremos registrar
export function registerTools(server: McpServer) {
    registerCreateProject(server);
    registerSelectDesign(server);
}
