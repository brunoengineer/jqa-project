import { NextResponse } from "next/server";

import { isLlmProvider, listModels } from "@/server/llm";

export async function GET(req: Request) {
	const provider = new URL(req.url).searchParams.get("provider");
	if (!isLlmProvider(provider)) {
		return NextResponse.json({ error: "unknown provider" }, { status: 400 });
	}
	return NextResponse.json(await listModels(provider));
}
