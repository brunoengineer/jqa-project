"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { deriveTitleFromText, generateMarkdownViaApi, saveOutputViaApi } from "./client-helpers";
import { useLlmSettings } from "./useLlmSettings";

export function TextTaskForm(props: {
	projectId: string;
	taskId:
		| "create-task-ticket"
		| "create-test-approach"
		| "create-test-plan"
		| "create-test-case";
	showTitle?: boolean;
	contextLabel?: string;
	contextPlaceholder?: string;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const llm = useLlmSettings({ provider: "ollama", model: "llama3.1" });

	const [title, setTitle] = useState<string>("");
	const [context, setContext] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = useMemo(() => {
		return context.trim().length > 0 && llm.model.trim().length > 0 && !isLoading;
	}, [context, llm.model, isLoading]);

	async function onGenerate() {
		setIsLoading(true);
		setError(null);
		try {
			llm.persistNow();

			const derivedTitle = deriveTitleFromText(title, context);
			const prompt = [
				`Task: ${props.taskId}`,
				derivedTitle ? `Title: ${derivedTitle}` : "",
				"",
				"Context:",
				context.trim(),
			].filter(Boolean).join("\n");

			const markdown = await generateMarkdownViaApi({
				provider: llm.provider,
				model: llm.model,
				taskId: props.taskId,
				prompt,
			});

			const saved = await saveOutputViaApi({
				projectId: props.projectId,
				taskId: props.taskId,
				title: derivedTitle,
				input: {
					provider: llm.provider,
					model: llm.model,
					title: derivedTitle,
					context,
				},
				markdown,
			});

			router.refresh();
			if (saved.outputId) {
				const next = new URLSearchParams(searchParams);
				next.set("taskId", props.taskId);
				next.set("outputId", saved.outputId);
				router.push(`?${next.toString()}`);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<label className="flex items-center gap-2">
					<span className="text-sm font-medium">Provider</span>
					<select
						value={llm.provider}
						onChange={(e) => llm.setProvider(e.target.value as "ollama" | "openai")}
						className="rounded-md border border-black/[.12] bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					>
						<option value="ollama">Ollama</option>
						<option value="openai">OpenAI</option>
					</select>
				</label>

				<label className="flex flex-1 items-center gap-2 min-w-[240px]">
					<span className="text-sm font-medium">Model</span>
					<input
						value={llm.model}
						onChange={(e) => llm.setModel(e.target.value)}
						placeholder={llm.provider === "ollama" ? "e.g. llama3.1" : "e.g. gpt-4.1-mini"}
						className="flex-1 rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					/>
				</label>
			</div>

			{props.showTitle === false ? null : (
				<label className="block">
					<span className="text-sm font-medium">Title (optional)</span>
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="mt-1 w-full rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
						placeholder="Optional title"
					/>
				</label>
			)}

			<label className="block">
				<span className="text-sm font-medium">{props.contextLabel ?? "Context"}</span>
				<textarea
					value={context}
					onChange={(e) => setContext(e.target.value)}
					className="mt-1 h-48 w-full resize-y rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					placeholder={props.contextPlaceholder ?? "Paste the ticket, requirements, acceptance criteria, and any notes."}
				/>
			</label>

			{error ? (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
					{error}
				</div>
			) : null}

			<button
				type="button"
				onClick={onGenerate}
				disabled={!canSubmit}
				className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
			>
				{isLoading ? "Generating…" : "Generate"}
			</button>
		</div>
	);
}
