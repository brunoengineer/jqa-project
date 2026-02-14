import fs from "node:fs/promises";
import crypto from "node:crypto";

import { ensureDir, readJsonFile, writeJsonFile } from "./fs-helpers";
import {
	getDataRoot,
	getProjectDir,
	getProjectMetaPath,
	getProjectsIndexPath,
} from "./paths";
import type { Project } from "./types";

type ProjectsIndex = {
	projects: Project[];
};

async function readProjectsIndex(): Promise<ProjectsIndex> {
	const indexPath = getProjectsIndexPath();
	const existing = await readJsonFile<ProjectsIndex>(indexPath);
	if (!existing || !Array.isArray(existing.projects)) {
		return { projects: [] };
	}
	return { projects: existing.projects };
}

async function writeProjectsIndex(index: ProjectsIndex): Promise<void> {
	await writeJsonFile(getProjectsIndexPath(), index);
}

export async function listProjects(): Promise<Project[]> {
	const index = await readProjectsIndex();
	return [...index.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(projectId: string): Promise<Project | null> {
	const id = projectId.trim();
	if (!id) return null;
	const index = await readProjectsIndex();
	return index.projects.find((p) => p.id === id) ?? null;
}

export async function createProject(input: { name: string }): Promise<Project> {
	const name = input.name.trim();
	if (!name) {
		throw new Error("Project name is required");
	}

	await ensureDir(getDataRoot());

	const now = new Date().toISOString();
	const project: Project = {
		id: crypto.randomUUID(),
		name,
		createdAt: now,
	};

	const projectDir = getProjectDir(project.id);
	await ensureDir(projectDir);
	await writeJsonFile(getProjectMetaPath(project.id), project);

	const index = await readProjectsIndex();
	index.projects.push(project);
	await writeProjectsIndex(index);

	return project;
}

export async function deleteProject(projectId: string): Promise<void> {
	const id = projectId.trim();
	if (!id) return;

	// Remove files first; ignore if missing.
	try {
		await fs.rm(getProjectDir(id), { recursive: true, force: true });
	} catch {
		// ignore
	}

	const index = await readProjectsIndex();
	const next = index.projects.filter((p) => p.id !== id);
	if (next.length !== index.projects.length) {
		await writeProjectsIndex({ projects: next });
	}
}
