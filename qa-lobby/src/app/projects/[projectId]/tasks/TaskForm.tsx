"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getProviderInfo } from "@/lib/providers";
import type { TaskDefinition, TaskField } from "@/tasks/registry";

import { deriveTitleFromText, generateMarkdownViaApi, saveOutputViaApi } from "./client-helpers";
import { ModelBar } from "./ModelBar";
import { useLlmSettings } from "./useLlmSettings";

type AttachedFile = { name: string; text: string };

function buildPrompt(
	fields: TaskField[],
	values: Record<string, string>,
	files: Record<string, AttachedFile[]>,
): string {
	const blocks: string[] = [];
	for (const field of fields) {
		const value = values[field.id]?.trim();
		const attached = files[field.id] ?? [];
		if (!value && attached.length === 0) continue;

		const parts = [`## ${field.label}`];
		if (value) parts.push(value);
		for (const f of attached) {
			parts.push(`### Attached file: ${f.name}\n\n\`\`\`\n${f.text.trim()}\n\`\`\``);
		}
		blocks.push(parts.join("\n\n"));
	}
	return blocks.join("\n\n");
}

function Elapsed() {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const t = setInterval(() => setSeconds((s) => s + 1), 1000);
		return () => clearInterval(t);
	}, []);
	return <span className="tabular-nums">{seconds}s</span>;
}

export function TaskForm(props: { projectId: string; task: TaskDefinition }) {
	const { task } = props;
	const router = useRouter();
	const llm = useLlmSettings();

	const [values, setValues] = useState<Record<string, string>>({});
	const [files, setFiles] = useState<Record<string, AttachedFile[]>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const missingRequired = task.fields.some(
		(f) => f.required && !values[f.id]?.trim() && !(files[f.id]?.length),
	);
	const canSubmit = !missingRequired && llm.model.trim().length > 0 && !isLoading;

	async function onAttach(fieldId: string, list: FileList | null) {
		if (!list?.length) return;
		const read = await Promise.all(Array.from(list).map(async (f) => ({ name: f.name, text: await f.text() })));
		setFiles((prev) => ({ ...prev, [fieldId]: [...(prev[fieldId] ?? []), ...read] }));
	}

	async function onGenerate() {
		if (!canSubmit) return;
		setIsLoading(true);
		setError(null);
		try {
			const prompt = buildPrompt(task.fields, values, files);
			const markdown = await generateMarkdownViaApi({
				provider: llm.provider,
				model: llm.model,
				taskId: task.id,
				prompt,
			});

			const firstField = task.fields[0];
			const title = deriveTitleFromText("", values[firstField.id] ?? files[firstField.id]?.[0]?.name ?? "");
			const { outputId } = await saveOutputViaApi({
				projectId: props.projectId,
				taskId: task.id,
				title,
				input: {
					provider: llm.provider,
					model: llm.model,
					fields: values,
					files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.map((f) => f.name)])),
				},
				markdown,
			});

			if (outputId) {
				router.push(`?taskId=${task.id}&outputId=${outputId}`, { scroll: false });
			}
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault();
				void onGenerate();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					void onGenerate();
				}
			}}
		>
			<ModelBar
				provider={llm.provider}
				model={llm.model}
				onProviderChange={llm.setProvider}
				onModelChange={llm.setModel}
			/>

			<div className="h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />

			<fieldset disabled={isLoading} className="space-y-4">
				{task.fields.map((field) => (
					<div key={field.id} className="space-y-1.5">
						<div className="flex items-end justify-between gap-3">
							<label htmlFor={`${task.id}-${field.id}`} className="field-label">
								{field.label}
								{field.required ? <span className="ml-1 text-accent">*</span> : null}
							</label>
							{field.allowFiles ? (
								<label className="cursor-pointer font-mono text-[11px] text-muted transition hover:text-accent">
									+ attach files
									<input
										type="file"
										multiple
										accept=".txt,.md,.csv,.json,.log,.diff,.patch,.xml,.yaml,.yml,.feature,text/*"
										className="sr-only"
										onChange={(e) => {
											void onAttach(field.id, e.target.files);
											e.target.value = "";
										}}
									/>
								</label>
							) : null}
						</div>

						{field.rows ? (
							<textarea
								id={`${task.id}-${field.id}`}
								value={values[field.id] ?? ""}
								onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
								rows={field.rows}
								placeholder={field.placeholder}
								className="input resize-y leading-relaxed"
							/>
						) : (
							<input
								id={`${task.id}-${field.id}`}
								value={values[field.id] ?? ""}
								onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
								placeholder={field.placeholder}
								className="input"
							/>
						)}

						{files[field.id]?.length ? (
							<div className="flex flex-wrap gap-1.5">
								{files[field.id].map((f, i) => (
									<span key={`${f.name}-${i}`} className="chip normal-case tracking-normal">
										{f.name}
										<button
											type="button"
											aria-label={`Remove ${f.name}`}
											className="text-faint hover:text-danger"
											onClick={() =>
												setFiles((prev) => ({
													...prev,
													[field.id]: prev[field.id].filter((_, j) => j !== i),
												}))
											}
										>
											×
										</button>
									</span>
								))}
							</div>
						) : null}
					</div>
				))}
			</fieldset>

			{error ? (
				<div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 font-mono text-xs leading-relaxed text-danger">
					{error}
				</div>
			) : null}

			{isLoading ? (
				<div className="overflow-hidden rounded-lg border border-accent/20 bg-accent/5">
					<div className="flex items-center justify-between gap-3 px-3 py-2.5 font-mono text-xs text-accent">
						<span>
							Generating with {getProviderInfo(llm.provider)?.label} · {llm.model}
						</span>
						<Elapsed />
					</div>
					<div className="h-0.5 bg-accent/10">
						<div className="scan-bar h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent" />
					</div>
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="font-mono text-[11px] text-faint">Ctrl + Enter to generate</p>
				<button type="submit" disabled={!canSubmit} className="btn-primary">
					{isLoading ? "Generating…" : `Generate ${task.name}`}
					{!isLoading ? <span aria-hidden>→</span> : null}
				</button>
			</div>
		</form>
	);
}
