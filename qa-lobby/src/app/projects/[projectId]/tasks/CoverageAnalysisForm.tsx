"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { deriveTitleFromText, generateMarkdownViaApi, saveOutputViaApi } from "./client-helpers";
import { useLlmSettings } from "./useLlmSettings";

async function readFilesAsText(files: FileList | null): Promise<{ name: string; text: string }[]> {
	if (!files || files.length === 0) return [];
	const arr = Array.from(files);
	return await Promise.all(
		arr.map(async (file) => {
			const text = await file.text();
			return { name: file.name, text };
		}),
	);
}

function formatFileSection(title: string, files: { name: string; text: string }[]) {
	if (files.length === 0) return "";
	const parts: string[] = [];
	parts.push(title);
	for (const f of files) {
		parts.push("");
		parts.push(`--- ${f.name} ---`);
		parts.push(f.text.trim());
	}
	return parts.join("\n");
}

export function CoverageAnalysisForm(props: { projectId: string }) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const llm = useLlmSettings({ provider: "ollama", model: "llama3.1" });

	const [notes, setNotes] = useState<string>("");
	const [requirementsText, setRequirementsText] = useState<string>("");
	const [testCasesText, setTestCasesText] = useState<string>("");
	const [requirementsFiles, setRequirementsFiles] = useState<FileList | null>(null);
	const [testCaseFiles, setTestCaseFiles] = useState<FileList | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = useMemo(() => {
		const hasReq = requirementsText.trim().length > 0 || (requirementsFiles?.length ?? 0) > 0;
		const hasTc = testCasesText.trim().length > 0 || (testCaseFiles?.length ?? 0) > 0;
		return hasReq && hasTc && llm.model.trim().length > 0 && !isLoading;
	}, [requirementsText, requirementsFiles, testCasesText, testCaseFiles, llm.model, isLoading]);

	async function onGenerate() {
		setIsLoading(true);
		setError(null);
		try {
			llm.persistNow();

			const reqFiles = await readFilesAsText(requirementsFiles);
			const tcFiles = await readFilesAsText(testCaseFiles);

			const promptParts: string[] = [];
			if (requirementsText.trim()) {
				promptParts.push("Requirements (pasted):");
				promptParts.push(requirementsText.trim());
			}
			const reqFileSection = formatFileSection("Requirements (files):", reqFiles);
			if (reqFileSection) {
				promptParts.push("");
				promptParts.push(reqFileSection);
			}

			promptParts.push("");
			if (testCasesText.trim()) {
				promptParts.push("Test Cases (pasted):");
				promptParts.push(testCasesText.trim());
			}
			const tcFileSection = formatFileSection("Test Cases (files):", tcFiles);
			if (tcFileSection) {
				promptParts.push("");
				promptParts.push(tcFileSection);
			}

			if (notes.trim()) {
				promptParts.push("");
				promptParts.push("Notes:");
				promptParts.push(notes.trim());
			}

			const prompt = promptParts.join("\n").trim();
			const derivedTitle = deriveTitleFromText("", prompt) ?? "Coverage Analysis";

			const markdown = await generateMarkdownViaApi({
				provider: llm.provider,
				model: llm.model,
				taskId: "create-coverage-analysis",
				prompt,
			});

			// IMPORTANT: do not persist uploaded file contents.
			const saved = await saveOutputViaApi({
				projectId: props.projectId,
				taskId: "create-coverage-analysis",
				title: derivedTitle,
				input: {
					provider: llm.provider,
					model: llm.model,
					notes: notes.trim() || undefined,
					requirements: {
						pastedChars: requirementsText.length,
						files: reqFiles.map((f) => ({ name: f.name, chars: f.text.length })),
					},
					testCases: {
						pastedChars: testCasesText.length,
						files: tcFiles.map((f) => ({ name: f.name, chars: f.text.length })),
					},
				},
				markdown,
			});

			router.refresh();
			if (saved.outputId) {
				const next = new URLSearchParams(searchParams);
				next.set("taskId", "create-coverage-analysis");
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
						className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
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

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="space-y-3">
					<h3 className="text-sm font-semibold">Requirements</h3>
					<label className="block">
						<span className="text-xs text-zinc-600 dark:text-zinc-400">Upload files (not saved)</span>
						<input
							type="file"
							multiple
							onChange={(e) => setRequirementsFiles(e.target.files)}
							className="mt-1 block w-full text-sm"
						/>
					</label>
					<label className="block">
						<span className="text-xs text-zinc-600 dark:text-zinc-400">Or paste text</span>
						<textarea
							value={requirementsText}
							onChange={(e) => setRequirementsText(e.target.value)}
							className="mt-1 h-40 w-full resize-y rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
							placeholder="Paste requirements here"
						/>
					</label>
				</div>

				<div className="space-y-3">
					<h3 className="text-sm font-semibold">Test cases</h3>
					<label className="block">
						<span className="text-xs text-zinc-600 dark:text-zinc-400">Upload files (not saved)</span>
						<input
							type="file"
							multiple
							onChange={(e) => setTestCaseFiles(e.target.files)}
							className="mt-1 block w-full text-sm"
						/>
					</label>
					<label className="block">
						<span className="text-xs text-zinc-600 dark:text-zinc-400">Or paste text</span>
						<textarea
							value={testCasesText}
							onChange={(e) => setTestCasesText(e.target.value)}
							className="mt-1 h-40 w-full resize-y rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
							placeholder="Paste test cases here"
						/>
					</label>
				</div>
			</div>

			<label className="block">
				<span className="text-sm font-medium">Notes (optional)</span>
				<textarea
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					className="mt-1 h-24 w-full resize-y rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
					placeholder="Any assumptions, known gaps, or naming conventions (UC IDs, etc.)"
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
