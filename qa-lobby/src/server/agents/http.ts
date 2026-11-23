import { NextResponse } from "next/server";

import { AgentInputError, AgentNotFoundError } from "./index";

/** Maps agent store errors to JSON responses: invalid input → 400, unknown agent → 404, anything else → 500. */
export function agentErrorResponse(error: unknown): NextResponse {
	const status = error instanceof AgentInputError ? 400 : error instanceof AgentNotFoundError ? 404 : 500;
	return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status });
}
