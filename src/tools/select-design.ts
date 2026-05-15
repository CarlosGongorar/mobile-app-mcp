import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { THEMES, StyleKey } from "../templates/themes.js";

function generateStylesFile(style: StyleKey): string {
    const theme = THEMES[style];
    const lines = Object.entries(theme).map(([key, value]) => `${key}: "${value}",`).join("\n");

    return `// This file was generated automatically by the MCP select-design tool.
// Selected style: ${style}

export const colors = {
${lines}
};

export default colors;
`;
}

export function registerSelectDesign(server: McpServer) {
    server.registerTool(
        "select-design",
        {
            description: "Select an existing design template with colors and write a styles.js file to the project",
            inputSchema: SelectDesignSchema,
        },
        async ({ style, project_name, output_dir }) => {
            const baseDir = output_dir ?? "./projects";
            const projectDir = path.join(baseDir, project_name);

            try {
                // Verificar que el proyecto existe
                const exists = await fs.access(projectDir).then(() => true).catch(() => false);
                if (!exists) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Project "${project_name}" does not exist in "${baseDir}". Create the project first with create-project.`,
                            },
                        ],
                    };
                }

                const stylesContent = generateStylesFile(style);
                const stylesPath = path.join(projectDir, "styles.js");

                await fs.writeFile(stylesPath, stylesContent, "utf-8");

                return {
                    content: [
                        {
                            type: "text",
                            text: [
                                `Style "${style}" applied successfully!`,
                                `File generated: ${stylesPath}`,
                                ``,
                                ``,
                                `Usage in your component:`,
                                ` import colors from './styles.js';`,
                                `// example: backgroundColor: colors.primary`,
                            ].join("\n"),
                        },
                    ],
                };
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error applying style "${style}": ${errMsg}`,
                        },
                    ],
                };
            }
        }
    );
}

const SelectDesignSchema = {
    style: z.enum(["lightblue", "dark", "purple", "green"]).describe("Design style to apply to the project"),
    project_name: z.string().min(1).describe("Name of the existing project where styles.js will be written"),
    output_dir: z.string().optional().describe("Base directory where the project lives, default ./projects"),
};