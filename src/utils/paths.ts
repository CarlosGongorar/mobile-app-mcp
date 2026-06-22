import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// src/utils/ -> src/ -> raíz del MCP -> projects/
export const DEFAULT_PROJECTS_DIR = path.join(__dirname, "../../projects");
