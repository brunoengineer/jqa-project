import { NextResponse } from "next/server";

import { listPrompts } from "@/server/prompts";

export async function GET() {
	try {
		const prompts = await listPrompts();
		return NextResponse.json({ prompts });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
