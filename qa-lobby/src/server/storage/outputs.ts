import fs from "node:fs/promises";
import crypto from "node:crypto";

import { ensureDir, readJsonFile } from "./fs-helpers";
import {
	getOutputMarkdownPath,
	getOutputMetaPath,
	getProjectOutputsDir,
} from "./paths";
import type { OutputDocument, OutputMetadata } from "./types";

export async function listProjectOutputs(
	projectId: string,
): Promise<OutputDocument[]> {
	const outputsDir = getProjectOutputsDir(projectId);
	let files: string[];
	try {
		files = await fs.readdir(outputsDir);
	} catch {
		return [];
	}

	const metaFiles = files.filter((f) => f.endsWith(".json"));
	const outputs: OutputDocument[] = [];

	for (const metaFile of metaFiles) {
		const outputId = metaFile.replace(/\.json$/i, "");
		const metaPath = getOutputMetaPath(projectId, outputId);
		const meta = await readJsonFile<OutputMetadata>(metaPath);
		if (!meta || meta.id !== outputId) {
			continue;
		}

		let markdown: string;
		try {
			markdown = await fs.readFile(
				getOutputMarkdownPath(projectId, outputId),
				"utf8",
			);
		} catch {
			continue;
		}

		outputs.push({ ...meta, markdown });
	}

	return outputs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createProjectOutput(input: {
	projectId: string;
	taskId: string;
	title?: string;
	input: unknown;
	markdown: string;
}): Promise<OutputDocument> {
	const projectId = input.projectId.trim();
	const taskId = input.taskId.trim();
	const markdown = input.markdown;
	const title = input.title?.trim() || undefined;
	if (!projectId) throw new Error("projectId is required");
	if (!taskId) throw new Error("taskId is required");
	if (typeof markdown !== "string" || !markdown.trim()) {
		throw new Error("markdown is required");
	}

	const outputId = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	const outputsDir = getProjectOutputsDir(projectId);
	await ensureDir(outputsDir);

	const meta: OutputMetadata = {
		id: outputId,
		projectId,
		taskId,
		title,
		input: input.input,
		createdAt,
		schemaVersion: 1,
	};

	await fs.writeFile(getOutputMarkdownPath(projectId, outputId), markdown, "utf8");
	await fs.writeFile(
		getOutputMetaPath(projectId, outputId),
		JSON.stringify(meta, null, 2),
		"utf8",
	);

	return { ...meta, markdown };
}

export async function deleteProjectOutput(input: {
	projectId: string;
	outputId: string;
}): Promise<void> {
	const projectId = input.projectId.trim();
	const outputId = input.outputId.trim();
	if (!projectId || !outputId) return;

	await Promise.allSettled([
		fs.rm(getOutputMarkdownPath(projectId, outputId), { force: true }),
		fs.rm(getOutputMetaPath(projectId, outputId), { force: true }),
	]);
}
