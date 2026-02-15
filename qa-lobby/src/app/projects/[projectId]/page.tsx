import Link from "next/link";
import { revalidatePath } from "next/cache";

import { deleteProjectOutput, getProject, listProjectOutputs } from "@/server/storage";
import { tasks } from "@/tasks/registry";
import { TaskSelector } from "./TaskSelector";
import { BugTicketForm } from "./tasks/BugTicketForm";
import { CoverageAnalysisForm } from "./tasks/CoverageAnalysisForm";
import { TextTaskForm } from "./tasks/TextTaskForm";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { DocumentSelectButton } from "./DocumentSelectButton";

function getOutputDisplayTitle(output: { title?: string; markdown: string }): string {
	if (output.title?.trim()) return output.title.trim();
	const md = output.markdown || "";
	const match = md.match(/^\s{0,3}#{1,6}\s+(.+?)\s*$/m);
	if (match?.[1]) return match[1].trim();
	const firstText = md
		.split(/\r?\n/)
		.map((l) => l.trim())
		.find((l) => l.length > 0 && !l.startsWith("#"));
	return firstText ? firstText.slice(0, 80) : "Untitled";
}

export default async function ProjectDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ projectId: string }>;
	searchParams: Promise<{ taskId?: string; outputId?: string }>;
}) {
	const { projectId } = await params;
	const { taskId, outputId } = await searchParams;
	const project = await getProject(projectId);
	const outputs = await listProjectOutputs(projectId);

	const selectedTaskId =
		tasks.find((t) => t.id === taskId)?.id ?? tasks[0]?.id ?? "";
	const selectedOutput = outputId
		? outputs.find((o) => o.id === outputId) ?? null
		: null;

	async function deleteOutputAction(formData: FormData) {
		"use server";
		const outputId = String(formData.get("outputId") ?? "");
		await deleteProjectOutput({ projectId, outputId });
		revalidatePath(`/projects/${projectId}`);
	}

	const outputsByTask = new Map<string, typeof outputs>();
	for (const output of outputs) {
		const list = outputsByTask.get(output.taskId) ?? [];
		list.push(output);
		outputsByTask.set(output.taskId, list);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<p className="text-xs text-zinc-600 dark:text-zinc-400">
					<Link href="/projects" className="hover:underline">
						Projects
					</Link>
					<span> / </span>
					<span>Project</span>
				</p>
				<h1 className="text-base font-semibold">
					{project?.name ?? "Unknown project"}
				</h1>
				{project ? (
					<p className="text-xs text-zinc-600 dark:text-zinc-400">
						{project.id}
					</p>
				) : null}
			</div>

			<section className="grid gap-6 lg:grid-cols-[320px_1fr]">
				<aside className="space-y-4">
					<div className="rounded-md border border-black/[.08] p-4 dark:border-white/10">
						<TaskSelector tasks={tasks} selectedTaskId={selectedTaskId} />
						{selectedTaskId ? (
							<p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
								{tasks.find((t) => t.id === selectedTaskId)?.description}
							</p>
						) : null}
					</div>

					<div className="space-y-3">
						<h2 className="text-sm font-semibold">Documents</h2>
						{outputs.length === 0 ? (
							<p className="text-sm text-zinc-600 dark:text-zinc-400">
								No documents yet.
							</p>
						) : (
							tasks.map((task) => {
								const taskOutputs = outputsByTask.get(task.id) ?? [];
								if (taskOutputs.length === 0) return null;
								return (
									<div key={task.id} className="space-y-2">
										<p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
											{task.name}
										</p>
										<ul className="space-y-2">
											{taskOutputs.map((output) => (
												<li
													key={output.id}
													className={`relative rounded-md border p-3 ${
														selectedOutput?.id === output.id
															? "border-black/30 dark:border-white/30"
															: "border-black/[.08] dark:border-white/10"
													}`}
												>
													<div className="relative z-10 flex items-start justify-between gap-3">
														<div className="min-w-0">
															<DocumentSelectButton
																taskId={task.id}
																outputId={output.id}
																className="block w-full truncate text-left text-sm font-medium underline-offset-2 hover:underline"
															>
																{getOutputDisplayTitle(output)}
															</DocumentSelectButton>
																<p className="text-xs text-zinc-600 dark:text-zinc-400">
																	{new Date(output.createdAt).toLocaleString()}
																</p>
															</div>

															<form action={deleteOutputAction} className="relative z-20">
																<input type="hidden" name="outputId" value={output.id} />
																<button
																	type="submit"
																	className="rounded-md border border-black/[.12] px-2 py-1 text-xs hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
																>
																	Delete
																</button>
															</form>
														</div>
												</li>
											))}
										</ul>
									</div>
								);
							})
						)}
					</div>
				</aside>

				<section className="space-y-4">
					<div className="rounded-md border border-black/[.08] p-4 dark:border-white/10">
						{selectedTaskId === "create-bug-ticket" ? (
							<BugTicketForm projectId={projectId} />
						) : selectedTaskId === "create-coverage-analysis" ? (
							<CoverageAnalysisForm projectId={projectId} />
						) : selectedTaskId === "create-task-ticket" ? (
							<TextTaskForm projectId={projectId} taskId="create-task-ticket" />
						) : selectedTaskId === "create-test-approach" ? (
							<TextTaskForm projectId={projectId} taskId="create-test-approach" showTitle={false} />
						) : selectedTaskId === "create-test-plan" ? (
							<TextTaskForm projectId={projectId} taskId="create-test-plan" showTitle={false} />
						) : selectedTaskId === "create-test-case" ? (
							<TextTaskForm projectId={projectId} taskId="create-test-case" showTitle={false} />
						) : (
							<p className="text-sm text-zinc-600 dark:text-zinc-400">
								Task UI not implemented yet.
							</p>
						)}
					</div>

					<div id="preview" className="rounded-md border border-black/[.08] p-4 dark:border-white/10">
						<h2 className="text-sm font-semibold">Preview</h2>
						{selectedOutput ? (
							<div className="mt-3">
								<MarkdownRenderer markdown={selectedOutput.markdown} />
							</div>
						) : (
							<p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
								Select a document on the left to preview it.
							</p>
						)}
					</div>
				</section>
			</section>
		</div>
	);
}
