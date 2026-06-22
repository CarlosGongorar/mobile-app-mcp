import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { readContext } from "../utils/context.js";

export function registerReadProject(server: McpServer) {
    server.registerTool(
        "read-project",
        {
            description:
                "Read the current state of a project created with this MCP. " +
                "Returns the theme, routing status, layouts, screens, components, and storage that have been configured. " +
                "Always call this before modifying or extending an existing project.",
            inputSchema: ReadProjectSchema,
        },
        async ({ project_name, output_dir }) => {
            const baseDir = output_dir ?? "./projects";
            const projectDir = path.join(baseDir, project_name);

            try {
                const projectExists = await fs.access(projectDir).then(() => true).catch(() => false);
                if (!projectExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `Project "${project_name}" does not exist in "${baseDir}".`,
                        }],
                    };
                }

                const ctx = await readContext(projectDir);
                if (!ctx) {
                    return {
                        content: [{
                            type: "text",
                            text: `Project "${project_name}" exists but has no context file (.mcp-context.json). It may have been created outside of this MCP.`,
                        }],
                    };
                }

                const lines = [
                    `Project: ${ctx.name}`,
                    `Created: ${ctx.createdAt}`,
                    `Location: ${path.resolve(projectDir)}`,
                    ``,
                    `Theme:   ${ctx.theme ?? "not set"}`,
                    `Routing: ${ctx.routingConfigured ? "configured" : "not configured"}`,
                    `Storage: ${ctx.storage ? `${ctx.storage.provider} (set up on ${ctx.storage.configuredAt})` : "not configured"}`,
                    ``,
                    `Layouts (${ctx.layouts.length}):`,
                    ...(ctx.layouts.length > 0
                        ? ctx.layouts.map(l => `  - ${l.name} [${l.type}] → ${l.path}`)
                        : ["  none"]),
                    ``,
                    `Screens (${ctx.screens.length}):`,
                    ...(ctx.screens.length > 0
                        ? ctx.screens.map(s => `  - ${s.name} → ${s.path}${s.layout ? ` [inside ${s.layout}]` : ""}`)
                        : ["  none"]),
                    ``,
                    `Components (${ctx.components.length}):`,
                    ...(ctx.components.length > 0
                        ? ctx.components.map(c => `  - ${c}`)
                        : ["  none"]),
                ];

                return {
                    content: [{
                        type: "text",
                        text: lines.join("\n"),
                    }],
                };

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error reading project "${project_name}": ${errMsg}`,
                    }],
                };
            }
        }
    );
}

const ReadProjectSchema = {
    project_name: z.string().min(1).describe("Name of the project to read."),
    output_dir: z.string().optional().describe("Base directory where the project lives. Defaults to ./projects."),
};
