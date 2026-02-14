import { NextResponse } from "next/server";

import { createProject, listProjects } from "@/server/storage";

export async function GET() {
	const projects = await listProjects();
	return NextResponse.json({ projects });
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as { name?: unknown };
		const name = typeof body.name === "string" ? body.name : "";
		const project = await createProject({ name });
		return NextResponse.json({ project }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 400 },
		);
	}
}
