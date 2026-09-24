import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { getProviderInfo } from "@/lib/providers";
import { deleteProjectOutput, getProject, listProjectOutputs, type OutputDocument } from "@/server/storage";
import { getTask, taskCategories, tasks } from "@/tasks/registry";

import { DocumentActions } from "./DocumentActions";
import { TaskForm } from "./tasks/TaskForm";

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

function getOutputModel(output: OutputDocument): string | null {
	const input = output.input as { provider?: unknown; model?: unknown } | null;
	if (!input || typeof input.model !== "string") return null;
	const provider = getProviderInfo(typeof input.provider === "string" ? input.provider : undefined);
	return provider ? `${provider.label} · ${input.model}` : input.model;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
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
	if (!project) notFound();

	const outputs = await listProjectOutputs(projectId);
	const selectedOutput = outputId ? (outputs.find((o) => o.id === outputId) ?? null) : null;
	const task = getTask(selectedOutput?.taskId ?? taskId) ?? tasks[0];
	const taskOutputs = outputs.filter((o) => o.taskId === task.id);

	const countByTask = new Map<string, number>();
	for (const o of outputs) countByTask.set(o.taskId, (countByTask.get(o.taskId) ?? 0) + 1);

	async function deleteOutputAction(formData: FormData) {
		"use server";
		const id = String(formData.get("outputId") ?? "");
		const back = String(formData.get("taskId") ?? "");
		await deleteProjectOutput({ projectId, outputId: id });
		revalidatePath(`/projects/${projectId}`);
		redirect(`/projects/${projectId}?taskId=${encodeURIComponent(back)}`);
	}

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<p className="eyebrow">
					<Link href="/projects" className="transition hover:text-accent">
						Projects
					</Link>
					<span className="px-2 text-faint">/</span>
					<span className="text-fg/80">{project.name}</span>
				</p>
				<div className="flex flex-wrap items-end justify-between gap-3">
					<h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
					<div className="flex gap-2">
						<span className="chip">{outputs.length} docs</span>
						<span className="chip">created {new Date(project.createdAt).toLocaleDateString()}</span>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
				<aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
					{taskCategories.map((category) => (
						<div key={category} className="space-y-1.5">
							<p className="eyebrow px-2">{category}</p>
							<ul className="space-y-0.5">
								{tasks
									.filter((t) => t.category === category)
									.map((t) => {
										const active = t.id === task.id;
										const count = countByTask.get(t.id) ?? 0;
										return (
											<li key={t.id}>
												<Link
													href={`?taskId=${t.id}`}
													className={`group flex items-center gap-2.5 rounded-lg border px-2 py-1.5 text-sm transition ${
														active
															? "border-accent/30 bg-accent/[0.07] text-fg shadow-[0_0_20px_-10px] shadow-accent"
															: "border-transparent text-muted hover:border-line hover:bg-surface hover:text-fg"
													}`}
												>
													<span className={`code-chip ${active ? "" : "border-line bg-surface-2 text-muted group-hover:text-fg"}`}>
														{t.code}
													</span>
													<span className="flex-1 truncate">{t.name}</span>
													{count > 0 ? <span className="font-mono text-[11px] text-faint">{count}</span> : null}
												</Link>
											</li>
										);
									})}
							</ul>
						</div>
					))}
				</aside>

				<section className="min-w-0 space-y-6">
					{selectedOutput ? (
						<article className="card overflow-hidden">
							<header className="space-y-3 border-b border-line px-5 py-4 sm:px-6">
								<Link
									href={`?taskId=${task.id}`}
									className="font-mono text-[11px] text-muted transition hover:text-accent"
								>
									← New {task.name}
								</Link>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 space-y-2">
										<h2 className="text-lg font-semibold tracking-tight">
											{getOutputDisplayTitle(selectedOutput)}
										</h2>
										<div className="flex flex-wrap gap-1.5">
											<span className="code-chip">{task.code}</span>
											{getOutputModel(selectedOutput) ? (
												<span className="chip normal-case tracking-normal">{getOutputModel(selectedOutput)}</span>
											) : null}
											<span className="chip normal-case tracking-normal">{formatDate(selectedOutput.createdAt)}</span>
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										<DocumentActions
											markdown={selectedOutput.markdown}
											title={getOutputDisplayTitle(selectedOutput)}
											createdAt={selectedOutput.createdAt}
										/>
										<form action={deleteOutputAction}>
											<input type="hidden" name="outputId" value={selectedOutput.id} />
											<input type="hidden" name="taskId" value={task.id} />
											<ConfirmSubmitButton />
										</form>
									</div>
								</div>
							</header>
							<div className="px-5 py-6 sm:px-8">
								<MarkdownRenderer markdown={selectedOutput.markdown} />
							</div>
						</article>
					) : (
						<div className="card p-5 sm:p-6">
							<div className="mb-5 flex items-start gap-3">
								<span className="code-chip mt-0.5 h-8 min-w-12 text-[11px]">{task.code}</span>
								<div className="space-y-1">
									<p className="eyebrow">{task.category} agent</p>
									<h2 className="text-xl font-semibold tracking-tight">{task.name}</h2>
									<p className="text-sm text-muted">{task.description}</p>
								</div>
							</div>
							<TaskForm key={task.id} projectId={projectId} task={task} />
						</div>
					)}

					<div className="space-y-2">
						<div className="flex items-center justify-between px-1">
							<p className="eyebrow">History · {task.name}</p>
							<span className="font-mono text-[11px] text-faint">{taskOutputs.length}</span>
						</div>
						{taskOutputs.length === 0 ? (
							<p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
								No {task.name} documents yet — generate one above.
							</p>
						) : (
							<ul className="card divide-y divide-line">
								{taskOutputs.map((o) => {
									const active = o.id === selectedOutput?.id;
									return (
										<li key={o.id}>
											<Link
												href={`?taskId=${task.id}&outputId=${o.id}`}
												className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${active ? "bg-accent/[0.06]" : ""}`}
											>
												<span className={`size-1.5 shrink-0 rounded-full ${active ? "bg-accent shadow-[0_0_8px] shadow-accent" : "bg-line-strong"}`} />
												<span className="min-w-0 flex-1 truncate text-sm">{getOutputDisplayTitle(o)}</span>
												<span className="hidden shrink-0 font-mono text-[11px] text-faint sm:inline">
													{getOutputModel(o) ?? ""}
												</span>
												<span className="shrink-0 font-mono text-[11px] text-muted">{formatDate(o.createdAt)}</span>
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
