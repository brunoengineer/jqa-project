import Link from "next/link";
import { revalidatePath } from "next/cache";

import { createProject, deleteProject, listProjects } from "@/server/storage";

export default async function ProjectsPage() {
	const projects = await listProjects();

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
		<div className="space-y-8">
			<section className="space-y-3">
				<h1 className="text-base font-semibold">Projects</h1>
				<form action={createProjectAction} className="flex gap-3 max-w-xl">
					<input
						name="name"
						required
						placeholder="Project name"
						className="flex-1 rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					/>
					<button
						type="submit"
						className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
					>
						Create
					</button>
				</form>
			</section>

		<section className="space-y-3">
			{projects.length === 0 ? (
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					No projects yet.
				</p>
			) : (
				<ul className="divide-y divide-black/[.08] rounded-md border border-black/[.08] dark:divide-white/10 dark:border-white/10">
					{projects.map((project) => (
						<li
							key={project.id}
							className="flex items-center justify-between gap-3 px-4 py-3"
						>
							<div className="min-w-0">
								<Link
									href={`/projects/${project.id}`}
									className="block truncate text-sm font-medium underline-offset-2 hover:underline"
								>
									{project.name}
								</Link>
								<p className="text-xs text-zinc-600 dark:text-zinc-400">
									{new Date(project.createdAt).toLocaleString()}
								</p>
							</div>

							<form action={deleteProjectAction}>
								<input type="hidden" name="projectId" value={project.id} />
								<button
									type="submit"
									className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
								>
									Delete
								</button>
							</form>
						</li>
					))}
				</ul>
			)}
		</section>
		</div>
	);
}
