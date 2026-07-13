import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import z from "zod";
import path from "path";
import fs from "fs/promises";
import {
    authHookTemplate,
    rootLayoutWithAuthTemplate,
    authLayoutTemplate,
    loginScreenTemplate,
    registerScreenTemplate,
} from "../templates/auth.js";
import { readContext, updateContext } from "../utils/context.js";
import { DEFAULT_PROJECTS_DIR } from "../utils/paths.js";

export function registerConfigureAuth(server: McpServer) {
    server.registerTool(
        "configure-auth",
        {
            description:
                "Sets up email/password authentication for a project. " +
                "Generates an AuthProvider + useAuth hook, an (auth) group with login/register screens, " +
                "and rewrites the root app/_layout.jsx to protect routes (unauthenticated users are redirected to login).\n\n" +
                "REQUIREMENTS — read before calling:\n" +
                "  - The project must have routing configured (run configure-routing first).\n" +
                "  - Storage MUST be configured with the 'supabase' provider (run configure-storage with provider='supabase' first). " +
                "This tool relies on the Supabase client at storage/config.js and only works with Supabase. " +
                "It will refuse to run if storage is missing or is asyncstorage/sqlite.",
            inputSchema: ConfigureAuthSchema,
        },
        async ({ project_name, output_dir }) => {
            const baseDir = output_dir ?? DEFAULT_PROJECTS_DIR;
            const projectDir = path.join(baseDir, project_name);
            const appDir = path.join(projectDir, "app");
            const hooksDir = path.join(projectDir, "hooks");
            const authDir = path.join(appDir, "(auth)");

            try {
                // 1. Project must exist
                const projectExists = await fs.access(projectDir).then(() => true).catch(() => false);
                if (!projectExists) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" does not exist in "${baseDir}". Create it first with create-project.`,
                        }],
                    };
                }

                // 2. Read project context (source of truth for storage/routing state)
                const ctx = await readContext(projectDir);
                if (!ctx) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" has no context file (.mcp-context.json). It may have been created outside of this MCP, so auth cannot be configured automatically.`,
                        }],
                    };
                }

                // 3. Routing must be configured (we need the app/ folder and root layout)
                if (!ctx.routingConfigured) {
                    return {
                        content: [{
                            type: "text",
                            text: `The project "${project_name}" does not have routing configured. Run configure-routing first.`,
                        }],
                    };
                }

                // 4. HARD GUARD: storage must be supabase
                if (!ctx.storage) {
                    return {
                        content: [{
                            type: "text",
                            text: [
                                `Cannot configure auth: no storage is configured.`,
                                `configure-auth only works with Supabase.`,
                                `Run configure-storage with provider='supabase' first, then try again.`,
                            ].join("\n"),
                        }],
                    };
                }
                if (ctx.storage.provider !== "supabase") {
                    return {
                        content: [{
                            type: "text",
                            text: [
                                `Cannot configure auth: this project uses '${ctx.storage.provider}' storage.`,
                                `configure-auth only works with Supabase, since it relies on supabase.auth.`,
                                `Reconfigure storage with provider='supabase' to enable authentication.`,
                            ].join("\n"),
                        }],
                    };
                }

                const hasTheme = ctx.theme !== null;

                // 5. Write the auth hook
                await fs.mkdir(hooksDir, { recursive: true });
                await fs.writeFile(path.join(hooksDir, "useAuth.jsx"), authHookTemplate(), "utf-8");

                // 6. Rewrite the root layout to wrap AuthProvider + protect routes
                await fs.writeFile(path.join(appDir, "_layout.jsx"), rootLayoutWithAuthTemplate(), "utf-8");

                // 7. Create the (auth) group with its layout and screens
                await fs.mkdir(authDir, { recursive: true });
                await fs.writeFile(path.join(authDir, "_layout.jsx"), authLayoutTemplate(), "utf-8");
                await fs.writeFile(path.join(authDir, "login.jsx"), loginScreenTemplate(hasTheme), "utf-8");
                await fs.writeFile(path.join(authDir, "register.jsx"), registerScreenTemplate(hasTheme), "utf-8");

                // 8. Update context: mark auth on, register the new layout + screens
                const authScreens = [
                    { name: "Login", file: "login.jsx", path: "app/(auth)/login.jsx", layout: "auth" },
                    { name: "Register", file: "register.jsx", path: "app/(auth)/register.jsx", layout: "auth" },
                ];
                const alreadyHasAuthLayout = ctx.layouts.some((l) => l.name.toLowerCase() === "auth");
                await updateContext(projectDir, {
                    auth: true,
                    layouts: alreadyHasAuthLayout
                        ? ctx.layouts
                        : [...ctx.layouts, { name: "auth", type: "stack", path: "app/(auth)" }],
                    screens: [
                        ...ctx.screens.filter((s) => s.layout !== "auth"),
                        ...authScreens,
                    ],
                });

                return {
                    content: [{
                        type: "text",
                        text: [
                            `Authentication configured for "${project_name}" (Supabase)`,
                            ``,
                            `Files created / updated:`,
                            `  hooks/useAuth.jsx          → AuthProvider + useAuth() hook`,
                            `  app/_layout.jsx            → wraps AuthProvider + protects routes`,
                            `  app/(auth)/_layout.jsx     → auth stack`,
                            `  app/(auth)/login.jsx       → sign in screen`,
                            `  app/(auth)/register.jsx    → sign up screen`,
                            hasTheme ? `` : `  (no theme found — screens use a neutral fallback palette; run select-design for themed screens)`,
                            ``,
                            `How it works:`,
                            `  - Unauthenticated users are redirected to /(auth)/login automatically.`,
                            `  - Use the hook anywhere: const { user, signIn, signUp, signOut } = useAuth()`,
                            `  - Enable Email auth in your Supabase dashboard (Authentication → Providers).`,
                        ].filter(Boolean).join("\n"),
                    }],
                };

            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Error configuring auth: ${errMsg}`,
                    }],
                };
            }
        }
    );
}

const ConfigureAuthSchema = {
    project_name: z.string().min(1).describe(
        "Name of the existing project where authentication will be configured. " +
        "Requires storage already configured with the 'supabase' provider."
    ),
    output_dir: z.string().optional().describe(
        "Base directory where the project lives. Defaults to ./projects."
    ),
};
