import { CopilotClient, type PermissionHandler } from "@github/copilot-sdk";

import type { ProviderModels } from "./types";

// Uses the GitHub Copilot CLI runtime bundled with @github/copilot-sdk and the
// signed-in Copilot user (`npx @github/copilot`, then /login once), or COPILOT_GITHUB_TOKEN.

const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

let clientPromise: Promise<CopilotClient> | null = null;

function getClient(): Promise<CopilotClient> {
	clientPromise ??= (async () => {
		const token = process.env.COPILOT_GITHUB_TOKEN;
		const client = new CopilotClient({
			logLevel: "error",
			...(token ? { gitHubToken: token } : {}),
		});
		await client.start();
		return client;
	})().catch((error) => {
		clientPromise = null; // allow a retry after e.g. installing/logging in
		throw error;
	});
	return clientPromise;
}

// QA Lobby only asks for text; no tool should ever run.
const denyAll: PermissionHandler = () => ({
	kind: "denied-no-approval-rule-and-could-not-request-from-user",
});

async function requireAuth(client: CopilotClient): Promise<void> {
	const auth = await client.getAuthStatus();
	if (!auth.isAuthenticated) {
		throw new Error(
			"Copilot: not signed in. Run `npx @github/copilot` and use /login once, or set COPILOT_GITHUB_TOKEN in .env.local",
		);
	}
}

export async function listCopilotModels(): Promise<ProviderModels> {
	try {
		const client = await getClient();
		const auth = await client.getAuthStatus();
		if (!auth.isAuthenticated) {
			return { available: false, models: [], message: "Not signed in — run `npx @github/copilot` and /login, or set COPILOT_GITHUB_TOKEN" };
		}
		const models = await client.listModels();
		return {
			available: true,
			models: models.map((m) => m.id),
			message: auth.login ? `Signed in as ${auth.login}` : undefined,
		};
	} catch (error) {
		return {
			available: false,
			models: [],
			message: error instanceof Error ? error.message : "Copilot runtime failed to start",
		};
	}
}

export async function generateWithCopilot(input: {
	model: string;
	system?: string;
	prompt: string;
}): Promise<string> {
	const client = await getClient();
	await requireAuth(client);

	const session = await client.createSession({
		model: input.model,
		availableTools: [],
		onPermissionRequest: denyAll,
		infiniteSessions: { enabled: false },
		...(input.system ? { systemMessage: { mode: "replace", content: input.system } } : {}),
	});

	const parts: string[] = [];
	const unsubscribe = session.on("assistant.message", (event) => {
		if (!event.agentId && event.data.content.trim()) parts.push(event.data.content);
	});

	try {
		await session.sendAndWait({ prompt: input.prompt }, GENERATION_TIMEOUT_MS);
	} finally {
		unsubscribe();
		await session.disconnect().catch(() => {});
		// Keep QA Lobby generations out of the user's Copilot CLI session history.
		await client.deleteSession(session.sessionId).catch(() => {});
	}

	const text = parts.join("\n\n");
	if (!text.trim()) throw new Error("Copilot returned an empty response");
	return text;
}
