import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import {
    StorageProvider,
    STORAGE_DEPS,
    storageConfigTemplate,
    storageHookTemplate,
    storageUsageInstructions,
} from "../templates/storage.js";
import { updateContext } from "../utils/context.js";
import { DEFAULT_PROJECTS_DIR } from "../utils/paths.js";

const execAsync = promisify(exec);

export function registerConfigureStorage(server: McpServer) {
    server.registerTool(
        "configure-storage",
        {
            description: `Installs dependencies and generates storage/config.ts + hooks/useStorage.ts for the chosen provider.

PROVIDER RULES — read before calling:

    - asyncstorage / sqlite:
    No external credentials needed. Call this tool directly.

    - supabase:
    This option REQUIRES the Supabase MCP server to be connected.
    Before calling this tool you MUST:
    1. Check your available tools for any Supabase MCP tool (e.g. get_project, list_projects, get_anon_key or similar).
    2. If NO Supabase MCP tools are found → do NOT call this tool with provider='supabase'.
        Instead, return this exact message to the user:
        "⚠️  The Supabase MCP server is not connected. To use this option you need to:
        1. Go to claude.ai → Settings → Integrations
        2. Connect the Supabase MCP server
        3. Try again once it's connected.
        Without it, configure-storage cannot create tables, relationships, or retrieve credentials automatically."
    3. If Supabase MCP tools ARE available:
        a. Use them to retrieve the project URL and anon key for the user's project.
        b. Use them to create the tables and relationships the project needs.
        c. Then call this tool passing supabase_url and supabase_publishable_key as parameters.`,
            inputSchema: ConfigureStorageSchema,
        },
        async ({ provider, project_name, output_dir, supabase_url, supabase_publishable_key }) => {
            const baseDir = output_dir ?? DEFAULT_PROJECTS_DIR;
            const projectDir = path.join(baseDir, project_name);
            const storageDir = path.join(projectDir, "storage");
            const hooksDir = path.join(projectDir, "hooks");

            try {
                // 1. Verify project exists
                const projectExists = await fs
                    .access(projectDir)
                    .then(() => true)
                    .catch(() => false);

                if (!projectExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" does not exist in "${baseDir}". Create it first with create-project.`,
                        }],
                    };
                }

                // 2. Guard: supabase requires credentials injected by the MCP
                if (provider === "supabase") {
                    if (!supabase_url || !supabase_publishable_key) {
                        return {
                            content: [{
                                type: "text",
                                text: [
                                    `⚠️  Cannot configure Supabase storage without credentials.`,
                                    ``,
                                    `This tool requires the Supabase MCP server to be connected so it can`,
                                    `retrieve your project URL and publishable key automatically.`,
                                    ``,
                                    `To fix this:`,
                                    `  1. Go to claude.ai → Settings → Integrations`,
                                    `  2. Connect the Supabase MCP server`,
                                    `  3. Ask me again — I will fetch the credentials and set everything up for you.`,
                                ].join("\n"),
                            }],
                        };
                    }
                }

                // 3. Create folders
                await fs.mkdir(storageDir, { recursive: true });
                await fs.mkdir(hooksDir, { recursive: true });

                // 4. Write config file (injecting real credentials if supabase)
                const config = storageConfigTemplate(provider as StorageProvider, supabase_url, supabase_publishable_key);
                await fs.writeFile(path.join(storageDir, "config.js"), config, "utf-8");

                // 5. Write hook
                await fs.writeFile(
                    path.join(hooksDir, "useStorage.js"),
                    storageHookTemplate(provider as StorageProvider),
                    "utf-8"
                );

                // 6. Update project context
                await updateContext(projectDir, {
                    storage: {
                        provider: provider as StorageProvider,
                        configuredAt: new Date().toISOString(),
                    },
                });

                // 7. Write .env with supabase credentials for reference
                if (provider === "supabase" && supabase_url && supabase_publishable_key) {
                    const envPath = path.join(projectDir, ".env");
                    const envContent = [
                        `# Supabase — generated by configure-storage`,
                        `EXPO_PUBLIC_SUPABASE_URL=${supabase_url}`,
                        `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${supabase_publishable_key}`,
                    ].join("\n");
                    await fs.writeFile(envPath, envContent, "utf-8");

                    // Append to .gitignore if it exists
                    const gitignorePath = path.join(projectDir, ".gitignore");
                    const gitignoreExists = await fs.access(gitignorePath).then(() => true).catch(() => false);
                    if (gitignoreExists) {
                        const current = await fs.readFile(gitignorePath, "utf-8");
                        if (!current.includes(".env")) {
                            await fs.appendFile(gitignorePath, "\n.env\n");
                        }
                    }
                }

                // Install dependencies last (the slowest step). If the MCP client times
                // out here, the generated files and context are already persisted; only
                // the packages would need to be reinstalled.
                const deps = STORAGE_DEPS[provider as StorageProvider];
                await execAsync(`npm install ${deps}`, {
                    cwd: projectDir,
                    timeout: 120_000,
                });

                return {
                    content: [{
                        type: "text",
                        text: [
                            `Storage configured for "${project_name}" using ${provider}`,
                            ``,
                            `Files created:`,
                            `  storage/config.js    → client / helpers`,
                            `  hooks/useStorage.js  → ready-to-use React hook`,
                            provider === "supabase" ? `  .env                 → credentials (git-ignored)` : "",
                            ``,
                            `Packages installed: ${deps}`,
                            ``,
                            storageUsageInstructions(provider as StorageProvider),
                        ].filter(Boolean).join("\n"),
                    }],
                };

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error configuring storage (${provider}): ${errMsg}`,
                    }],
                };
            }
        }
    );
}

const ConfigureStorageSchema = {
    provider: z
        .enum(["supabase", "asyncstorage", "sqlite"])
        .describe(
            "Storage provider. " +
            "'supabase' requires the Supabase MCP server connected — do not use without it. " +
            "'asyncstorage' = local key-value. " +
            "'sqlite' = local relational DB via expo-sqlite."
        ),
    project_name: z.string().min(1).describe(
        "Name of the existing project where storage will be configured."
    ),
    output_dir: z.string().optional().describe(
        "Base directory where the project lives. Defaults to ./projects."
    ),
    supabase_url: z.string().optional().describe(
        "Supabase project URL. Must be retrieved via the Supabase MCP server before calling this tool."
    ),
    supabase_publishable_key: z.string().optional().describe(
        "Supabase publishable key. Must be retrieved via the Supabase MCP server before calling this tool."
    ),
};