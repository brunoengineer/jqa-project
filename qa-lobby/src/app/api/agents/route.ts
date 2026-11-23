import { NextResponse } from "next/server";

import {
	createAgent,
	listAgentsWithPrompts,
	listRemovedBuiltInAgents,
	validateAgentInput,
	validateInstructions,
	withPrompt,
} from "@/server/agents";
import { agentErrorResponse } from "@/server/agents/http";

/** Active agents with their instructions, plus removed built-ins that can be restored. */
export async function GET() {
	try {
		const [agents, removed] = await Promise.all([listAgentsWithPrompts(), listRemovedBuiltInAgents()]);
		return NextResponse.json({ agents, removed });
	} catch (error) {
		return agentErrorResponse(error);
	}
}

/** Creates a custom agent. Body: { name, description?, category?, code?, fields, instructions }. */
export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Record<string, unknown>;
		const input = validateAgentInput(body);
		const instructions = validateInstructions(body.instructions, true);
		const agent = await createAgent(input, instructions);
		return NextResponse.json({ agent: await withPrompt(agent) }, { status: 201 });
	} catch (error) {
		return agentErrorResponse(error);
	}
}
