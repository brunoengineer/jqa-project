import { NextResponse } from "next/server";

import { listAgentsWithPrompts } from "@/server/agents";
import { agentErrorResponse } from "@/server/agents/http";

export async function GET() {
	try {
		const prompts = await listAgentsWithPrompts();
		return NextResponse.json({ prompts });
	} catch (error) {
		return agentErrorResponse(error);
	}
}
