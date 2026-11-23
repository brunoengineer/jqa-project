// Agent store: merges the built-in agents declared in code with the agents created in the UI.
//
// data/agents.json holds the custom agent definitions and the ids of built-in agents the user removed.
// Built-ins can't be physically deleted (they ship with the app), so removing one only hides it and
// it can be restored later. Custom agents are deleted for good, together with their instructions.
// Generated documents are never touched: they keep their taskId and stay readable in their project.

import path from "node:path";

import { getDataRoot } from "@/server/storage/paths";
import { readJsonFile, writeJsonFile } from "@/server/storage/fs-helpers";
import { deleteSavedPrompt, getPromptContent, savePrompt, type PromptSource } from "@/server/prompts/prompts";
import {
	AGENT_ID_PATTERN,
	DEFAULT_CUSTOM_CATEGORY,
	builtInTasks,
	getBuiltInTask,
	isLegacyTaskId,
	resolveTaskId,
	slugify,
	type AgentRecord,
	type TaskDefinition,
	type TaskField,
} from "@/tasks/registry";

type AgentsFile = {
	custom: TaskDefinition[];
	removedBuiltIns: string[];
};

/** An agent together with the instructions it currently runs with. */
export type AgentWithPrompt = AgentRecord & {
	content: string;
	source: PromptSource;
};

/** Validated, user-editable part of an agent (everything except its id). */
export type AgentInput = Omit<TaskDefinition, "id">;

/** Thrown for invalid user input; API routes map it to a 400 response. */
export class AgentInputError extends Error {}

/** Thrown when an agent id doesn't exist; API routes map it to a 404 response. */
export class AgentNotFoundError extends Error {
	constructor(id: string) {
		super(`Agent "${id}" not found`);
	}
}

const LIMITS = {
	name: 60,
	description: 240,
	category: 30,
	code: 4,
	fields: 12,
	fieldLabel: 80,
	placeholder: 200,
	rows: 30,
	instructions: 100_000,
};

function getAgentsPath(): string {
	return path.join(getDataRoot(), "agents.json");
}

async function readAgentsFile(): Promise<AgentsFile> {
	const raw = await readJsonFile<Partial<AgentsFile>>(getAgentsPath());
	return {
		custom: Array.isArray(raw?.custom) ? raw.custom : [],
		removedBuiltIns: Array.isArray(raw?.removedBuiltIns) ? raw.removedBuiltIns : [],
	};
}

// Serializes read-modify-write cycles on agents.json so concurrent requests can't drop each other's changes.
let fileLock: Promise<unknown> = Promise.resolve();

function updateAgentsFile<T>(mutate: (file: AgentsFile) => Promise<{ next: AgentsFile | null; result: T }>): Promise<T> {
	const run = fileLock.then(async () => {
		const { next, result } = await mutate(await readAgentsFile());
		if (next) await writeJsonFile(getAgentsPath(), next);
		return result;
	});
	fileLock = run.catch(() => {});
	return run;
}

// ---------------------------------------------------------------------------
// Reads

/** Active agents: built-ins that weren't removed, followed by custom agents. */
export async function listAgents(): Promise<AgentRecord[]> {
	const file = await readAgentsFile();
	const removed = new Set(file.removedBuiltIns);
	return [
		...builtInTasks.filter((t) => !removed.has(t.id)).map((t) => ({ ...t, builtIn: true })),
		...file.custom.map((t) => ({ ...t, builtIn: false })),
	];
}

/** Built-in agents the user removed, so they can be offered for restore. */
export async function listRemovedBuiltInAgents(): Promise<AgentRecord[]> {
	const file = await readAgentsFile();
	const removed = new Set(file.removedBuiltIns);
	return builtInTasks.filter((t) => removed.has(t.id)).map((t) => ({ ...t, builtIn: true }));
}

/** Looks up an active agent by id (legacy ids are resolved). Returns null for removed or unknown agents. */
export async function getAgent(agentId: string | undefined): Promise<AgentRecord | null> {
	if (!agentId) return null;
	const id = resolveTaskId(agentId.trim());
	const agents = await listAgents();
	return agents.find((a) => a.id === id) ?? null;
}

export async function withPrompt(agent: AgentRecord): Promise<AgentWithPrompt> {
	return { ...agent, ...(await getPromptContent(agent.id)) };
}

export async function listAgentsWithPrompts(): Promise<AgentWithPrompt[]> {
	return Promise.all((await listAgents()).map(withPrompt));
}

// ---------------------------------------------------------------------------
// Validation

function str(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function requireLength(label: string, value: string, max: number, required: boolean): string {
	if (required && !value) throw new AgentInputError(`${label} is required`);
	if (value.length > max) throw new AgentInputError(`${label} must be at most ${max} characters`);
	return value;
}

function deriveCode(name: string): string {
	const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
	return letters.slice(0, 3) || "AGT";
}

function validateFields(raw: unknown): TaskField[] {
	if (!Array.isArray(raw) || raw.length === 0) throw new AgentInputError("At least one input field is required");
	if (raw.length > LIMITS.fields) throw new AgentInputError(`At most ${LIMITS.fields} input fields are allowed`);

	const usedIds = new Set<string>();
	return raw.map((item, i) => {
		const f = (item ?? {}) as Record<string, unknown>;
		const label = requireLength(`Field ${i + 1} label`, str(f.label), LIMITS.fieldLabel, true);
		const placeholder = requireLength(`Field ${i + 1} placeholder`, str(f.placeholder), LIMITS.placeholder, false);

		// Keep an existing id when editing (so saved inputs still line up), otherwise derive it from the label.
		const proposed = str(f.id);
		let id = AGENT_ID_PATTERN.test(proposed) && !usedIds.has(proposed) ? proposed : slugify(label, 32) || `field-${i + 1}`;
		for (let n = 2; usedIds.has(id); n++) id = `${slugify(label, 28) || "field"}-${n}`;
		usedIds.add(id);

		const rows = typeof f.rows === "number" && Number.isFinite(f.rows) ? Math.round(f.rows) : 0;
		const field: TaskField = { id, label };
		if (placeholder) field.placeholder = placeholder;
		if (f.required === true) field.required = true;
		if (rows > 0) field.rows = Math.min(rows, LIMITS.rows);
		if (f.allowFiles === true) field.allowFiles = true;
		return field;
	});
}

/** Validates and normalizes agent details sent by the client. */
export function validateAgentInput(raw: unknown): AgentInput {
	const body = (raw ?? {}) as Record<string, unknown>;
	const name = requireLength("Name", str(body.name), LIMITS.name, true);
	const description = requireLength("Description", str(body.description), LIMITS.description, false);
	const category = requireLength("Category", str(body.category) || DEFAULT_CUSTOM_CATEGORY, LIMITS.category, true);

	const code = (str(body.code) || deriveCode(name)).toUpperCase();
	if (!/^[A-Z0-9]+$/.test(code) || code.length > LIMITS.code) {
		throw new AgentInputError(`Code must be 1-${LIMITS.code} letters or digits`);
	}

	return { name, description, category, code, fields: validateFields(body.fields) };
}

export function validateInstructions(raw: unknown, required: boolean): string {
	const value = typeof raw === "string" ? raw : "";
	if (required && !value.trim()) throw new AgentInputError("Instructions are required");
	if (value.length > LIMITS.instructions) {
		throw new AgentInputError(`Instructions must be at most ${LIMITS.instructions.toLocaleString()} characters`);
	}
	return value;
}

// ---------------------------------------------------------------------------
// Writes

function isTakenId(file: AgentsFile, id: string): boolean {
	// Removed built-ins still own their id so restoring one can never clash with a custom agent.
	return Boolean(getBuiltInTask(id)) || isLegacyTaskId(id) || file.custom.some((a) => a.id === id);
}

function uniqueAgentId(file: AgentsFile, name: string): string {
	const base = slugify(name) || "agent";
	let id = base;
	for (let n = 2; isTakenId(file, id); n++) id = `${base.slice(0, 44)}-${n}`;
	return id;
}

export async function createAgent(input: AgentInput, instructions: string): Promise<AgentRecord> {
	return updateAgentsFile(async (file) => {
		const agent: TaskDefinition = { id: uniqueAgentId(file, input.name), ...input };
		// Write the instructions first: if that fails, no agent without instructions is left behind.
		await savePrompt(agent.id, instructions);
		return {
			next: { ...file, custom: [...file.custom, agent] },
			result: { ...agent, builtIn: false },
		};
	});
}

/** Updates a custom agent's details. Built-in agents are defined in code and only their instructions can change. */
export async function updateAgent(agentId: string, input: AgentInput): Promise<AgentRecord> {
	return updateAgentsFile(async (file) => {
		const index = file.custom.findIndex((a) => a.id === agentId);
		if (index < 0) {
			if (getBuiltInTask(agentId)) {
				throw new AgentInputError("Built-in agents can't be edited; change their instructions instead");
			}
			throw new AgentNotFoundError(agentId);
		}
		const agent: TaskDefinition = { id: agentId, ...input };
		const custom = [...file.custom];
		custom[index] = agent;
		return { next: { ...file, custom }, result: { ...agent, builtIn: false } };
	});
}

/**
 * Removes an agent. A custom agent is deleted with its instructions; a built-in agent is hidden
 * (its saved instruction override is kept, so restoring it brings back the user's edits).
 */
export async function deleteAgent(agentId: string): Promise<{ builtIn: boolean }> {
	return updateAgentsFile<{ builtIn: boolean }>(async (file) => {
		if (file.custom.some((a) => a.id === agentId)) {
			await deleteSavedPrompt(agentId);
			return { next: { ...file, custom: file.custom.filter((a) => a.id !== agentId) }, result: { builtIn: false } };
		}
		const builtIn = getBuiltInTask(agentId);
		if (builtIn && builtIn.id === agentId) {
			if (file.removedBuiltIns.includes(agentId)) return { next: null, result: { builtIn: true } };
			return { next: { ...file, removedBuiltIns: [...file.removedBuiltIns, agentId] }, result: { builtIn: true } };
		}
		throw new AgentNotFoundError(agentId);
	});
}

export async function restoreBuiltInAgent(agentId: string): Promise<AgentRecord> {
	return updateAgentsFile(async (file) => {
		const builtIn = getBuiltInTask(agentId);
		if (!builtIn || builtIn.id !== agentId) throw new AgentNotFoundError(agentId);
		return {
			next: file.removedBuiltIns.includes(agentId)
				? { ...file, removedBuiltIns: file.removedBuiltIns.filter((id) => id !== agentId) }
				: null,
			result: { ...builtIn, builtIn: true },
		};
	});
}
