import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { buildUsageExample, COMPONENTS, VARIANTS } from "../templates/components.js";

export function registerCreateComponent(server: McpServer) {
    server.registerTool(
        "create-component",
        {
            description: "Generate a React Native UI component (button, input, text, card, badge, divider, avatar) inside the project's components/ folder. Components import colors from styles.js and expose variant and style props at usage time.",
            inputSchema: CreateComponentSchema,
        },
        async ({ component_type, project_name, output_dir }) => {
            const baseDir = output_dir ?? "./projects";
            const projectDir = path.join(baseDir, project_name);
            const componentsDir = path.join(projectDir, "components");

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

                const stylesExists = await fs.access(path.join(projectDir, "styles.js")).then(() => true).catch(() => false);
                if (!stylesExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `The file "styles.js" was not found in "${projectDir}". Apply a theme first with select-design.`,
                        }],
                    };
                }

                await fs.mkdir(componentsDir, { recursive: true });

                const componentName = component_type.charAt(0).toUpperCase() + component_type.slice(1);
                const fileName = `${componentName}.jsx`;
                const filePath = path.join(componentsDir, fileName);

                await fs.writeFile(filePath, COMPONENTS[component_type](), "utf-8");

                return {
                    content: [{
                        type: "text",
                        text: [
                            `Component "${componentName}" created successfully!`,
                            `File: components/${fileName}`,
                            `Available variants: ${(VARIANTS[component_type] ?? []).join(", ")}`,
                            ``,
                            `Use example:`,
                            buildUsageExample(component_type, componentName),
                        ].join("\n"),
                    }],
                };

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error creating the component "${component_type}": ${errMsg}`,
                    }],
                };
            }
        }
    );
}

const CreateComponentSchema = {
    component_type: z
        .enum(["button", "input", "text", "card", "badge", "divider", "avatar"])
        .describe("Type of UI component to generate"),
    project_name: z
        .string()
        .min(1)
        .describe("Name of the existing project where the component will be created"),
    output_dir: z
        .string()
        .optional()
        .describe("Base directory where the project lives, default ./projects"),
};