import { PROJECT_CONTEXT_MAX_CHARS } from "@/lib/project-context";

import { readTextFile, writeTextFile } from "./fs-helpers";
import { getProjectContextPath } from "./paths";

export async function getProjectContext(projectId: string): Promise<string> {
	return (await readTextFile(getProjectContextPath(projectId))) ?? "";
}

export async function saveProjectContext(projectId: string, content: string): Promise<void> {
	const text = content.trim();
	if (text.length > PROJECT_CONTEXT_MAX_CHARS) {
		throw new Error(`Project context is limited to ${PROJECT_CONTEXT_MAX_CHARS.toLocaleString()} characters`);
	}
	await writeTextFile(getProjectContextPath(projectId), text);
}
