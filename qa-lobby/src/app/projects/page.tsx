import Link from "next/link";
import { revalidatePath } from "next/cache";

import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { countProjectOutputs, createProject, deleteProject, listProjects } from "@/server/storage";
import { tasks } from "@/tasks/registry";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
	const projects = await listProjects();
	const counts = await Promise.all(projects.map((p) => countProjectOutputs(p.id)));
	const totalDocs = counts.reduce((a, b) => a + b, 0);

	async function createProjectAction(formData: FormData) {
		"use server";
		const name = String(formData.get("name") ?? "");
		await createProject({ name });
		revalidatePath("/projects");
	}

	async function deleteProjectAction(formData: FormData) {
		"use server";
		const projectId = String(formData.get("projectId") ?? "");
		await deleteProject(projectId);
		revalidatePath("/projects");
	}

	return (
		<div className="space-y-10">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
				<div className="space-y-3">
					<p className="eyebrow">{"// workspace"}</p>
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						QA agents,{" "}
						<span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
							on your machine.
						</span>
					</h1>
					<p className="max-w-xl text-muted">
						Generate bug tickets, test plans, coverage analyses and more with {tasks.length} QA agents — using
						Ollama locally, or Claude and Copilot when you need more power.
					</p>
					<div className="flex flex-wrap gap-2 pt-1">
						<span className="chip">{projects.length} projects</span>
						<span className="chip">{totalDocs} documents</span>
						<span className="chip">{tasks.length} agents</span>
					</div>
				</div>

				<form action={createProjectAction} className="card flex gap-2 p-2">
					<input
						name="name"
						required
						autoComplete="off"
						className="input border-transparent bg-transparent focus:ring-0"
						placeholder="New project name…"
					/>
					<button type="submit" className="btn-primary">
						Create
					</button>
				</form>
			</section>

			<section className="space-y-3">
				<p className="eyebrow">Projects</p>
				{projects.length === 0 ? (
					<div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
						<p className="font-mono text-sm text-muted">No projects yet.</p>
						<p className="mt-1 text-sm text-faint">Create one above to start generating QA documents.</p>
					</div>
				) : (
					<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{projects.map((project, i) => (
							<li
								key={project.id}
								className="card group relative p-5 transition hover:border-accent/30 hover:shadow-[0_0_40px_-16px] hover:shadow-accent"
							>
								<Link href={`/projects/${project.id}`} className="block space-y-4">
									<div className="flex items-start justify-between gap-3">
										<span className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 font-mono text-sm font-semibold text-accent">
											{project.name.trim().charAt(0).toUpperCase()}
										</span>
										<span className="font-mono text-xs text-faint transition group-hover:translate-x-0.5 group-hover:text-accent">
											open →
										</span>
									</div>
									<div className="space-y-1">
										<h2 className="truncate font-medium">{project.name}</h2>
										<p className="font-mono text-[11px] text-faint">{project.id.slice(0, 8)}</p>
									</div>
									<div className="flex gap-3 font-mono text-[11px] text-muted">
										<span>{counts[i]} docs</span>
										<span className="text-faint">·</span>
										<span>{new Date(project.createdAt).toLocaleDateString()}</span>
									</div>
								</Link>
								<form action={deleteProjectAction} className="absolute right-4 bottom-4 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
									<input type="hidden" name="projectId" value={project.id} />
									<ConfirmSubmitButton />
								</form>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
