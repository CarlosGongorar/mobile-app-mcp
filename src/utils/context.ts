import fs from "fs/promises";
import path from "path";

export interface LayoutEntry {
    name: string;
    type: "stack" | "tabs";
    path: string;
}

export interface ScreenEntry {
    name: string;
    file: string;
    path: string;
    layout: string | null;
}

export interface StorageEntry {
    provider: "supabase" | "asyncstorage" | "sqlite";
    configuredAt: string;
}

export interface ProjectContext {
    name: string;
    createdAt: string;
    outputDir: string;
    theme: string | null;
    routingConfigured: boolean;
    layouts: LayoutEntry[];
    screens: ScreenEntry[];
    components: string[];
    storage: StorageEntry | null;
}

const CONTEXT_FILE = ".mcp-context.json";

export async function readContext(projectDir: string): Promise<ProjectContext | null> {
    const contextPath = path.join(projectDir, CONTEXT_FILE);
    try {
        const raw = await fs.readFile(contextPath, "utf-8");
        return JSON.parse(raw) as ProjectContext;
    } catch {
        return null;
    }
}

export async function writeContext(projectDir: string, context: ProjectContext): Promise<void> {
    const contextPath = path.join(projectDir, CONTEXT_FILE);
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2), "utf-8");
}

export async function updateContext(projectDir: string, patch: Partial<ProjectContext>): Promise<void> {
    const current = await readContext(projectDir);
    if (!current) return;
    await writeContext(projectDir, { ...current, ...patch });
}
