import fs from "node:fs/promises";
import path from "node:path";

import { tasks } from "@/tasks/registry";
import { ensureDir, fileExists, readTextFile, writeTextFile } from "@/server/storage/fs-helpers";

import { getDefaultPromptPath, getPromptPath, getPromptsDir } from "./paths";

export type PromptSource = "saved" | "default" | "empty";

export type PromptRecord = {
	taskId: string;
	taskName: string;
	taskDescription: string;
	content: string;
	source: PromptSource;
};

async function readPromptFile(filePath: string): Promise<string | null> {
	const txt = await readTextFile(filePath);
	if (txt == null) return null;
	return txt;
}

export async function getPromptContent(taskId: string): Promise<{ content: string; source: PromptSource }> {
	const savedPath = getPromptPath(taskId);
	const saved = await readPromptFile(savedPath);
	if (saved != null) return { content: saved, source: "saved" };

	const defaultPath = getDefaultPromptPath(taskId);
	const def = await readPromptFile(defaultPath);
	if (def != null) return { content: def, source: "default" };

	return { content: "", source: "empty" };
}

export async function listPrompts(): Promise<PromptRecord[]> {
	const results: PromptRecord[] = [];
	for (const task of tasks) {
		const { content, source } = await getPromptContent(task.id);
		results.push({
			taskId: task.id,
			taskName: task.name,
			taskDescription: task.description,
			content,
			source,
		});
	}
	return results;
}

export async function savePrompt(taskId: string, content: string): Promise<void> {
	await ensureDir(getPromptsDir());
	const filePath = getPromptPath(taskId);
	await writeTextFile(filePath, content);
}

export async function deleteSavedPrompt(taskId: string): Promise<boolean> {
	const filePath = getPromptPath(taskId);
	if (!(await fileExists(filePath))) return false;
	await fs.unlink(filePath);
	return true;
}

export async function hasDefaultPrompt(taskId: string): Promise<boolean> {
	return fileExists(getDefaultPromptPath(taskId));
}

export async function getSavedPromptUpdatedAt(taskId: string): Promise<string | null> {
	const filePath = getPromptPath(taskId);
	try {
		const st = await fs.stat(filePath);
		return st.mtime.toISOString();
	} catch {
		return null;
	}
}

export async function getDefaultPromptUpdatedAt(taskId: string): Promise<string | null> {
	const filePath = getDefaultPromptPath(taskId);
	try {
		const st = await fs.stat(filePath);
		return st.mtime.toISOString();
	} catch {
		return null;
	}
}

export async function ensureDefaultPromptsDirExists(): Promise<void> {
	// Not required, but keeps behavior explicit.
	await ensureDir(path.dirname(getDefaultPromptPath("_placeholder_")));
}
