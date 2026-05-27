import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

export function registerInitProject(server: McpServer) {
    server.registerTool(
        "init-project",
        {
            description:
                "ALWAYS call this tool first before any other tool. " +
                "It returns a structured conversation guide that tells Claude exactly " +
                "which questions to ask the user, in what order, and which tools to call " +
                "based on the answers. Use it as your orchestration blueprint for building a mobile app.",
            inputSchema: InitProjectSchema,
        },
        async ({ user_intent }) => {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const promptPath = path.join(__dirname, "../utils/init-project.md");
            
            try {
                const template = await fs.readFile(promptPath, "utf-8");
                const guide = template.replace("{{user_intent}}", user_intent);

                return {
                    content: [{ type: "text", text: guide }],
                };
            } catch {
                return {
                    content: [{
                        type: "text",
                        text: `Error: could not read orchestration guide at "${promptPath}". Make sure the file exists. `,
                    }],
                };
            }
        }
    );
}

const InitProjectSchema = {
    user_intent: z
        .string()
        .describe(
            "Brief description of what the user wants to build, " +
            "taken directly from their first message. " +
            "E.g. 'una app de recetas', 'a fitness tracker', 'no sé por dónde empezar'."
        ),
};