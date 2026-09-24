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

// Serializes read-modify-write cycles on projects.json so concurrent requests
// (e.g. two deletes at once) can't overwrite each other's changes.
let indexLock: Promise<unknown> = Promise.resolve();

function updateProjectsIndex(mutate: (index: ProjectsIndex) => ProjectsIndex | null): Promise<void> {
	const run = indexLock.then(async () => {
		const next = mutate(await readProjectsIndex());
		if (next) await writeJsonFile(getProjectsIndexPath(), next);
	});
	indexLock = run.catch(() => {});
	return run;
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

	await updateProjectsIndex((index) => ({ projects: [...index.projects, project] }));

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

	await updateProjectsIndex((index) => {
		const next = index.projects.filter((p) => p.id !== id);
		return next.length !== index.projects.length ? { projects: next } : null;
	});
}
