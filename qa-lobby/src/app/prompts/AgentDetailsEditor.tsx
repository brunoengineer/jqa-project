"use client";

import type { TaskField } from "@/tasks/registry";

/** Client-side draft of an agent's details. `key` keeps React lists stable while fields are edited. */
export type FieldDraft = TaskField & { key: string };

export type AgentDetailsDraft = {
	name: string;
	code: string;
	category: string;
	description: string;
	fields: FieldDraft[];
};

type FieldKind = "line" | "text" | "files";

let keySeq = 0;
export function newFieldKey(): string {
	keySeq += 1;
	return `f${Date.now().toString(36)}${keySeq}`;
}

export function toFieldDrafts(fields: TaskField[]): FieldDraft[] {
	return fields.map((f) => ({ ...f, key: newFieldKey() }));
}

export function blankField(): FieldDraft {
	return { key: newFieldKey(), id: "", label: "", rows: 5 };
}

function kindOf(f: TaskField): FieldKind {
	if (f.allowFiles) return "files";
	return f.rows ? "text" : "line";
}

function withKind(f: FieldDraft, kind: FieldKind): FieldDraft {
	if (kind === "line") return { ...f, rows: undefined, allowFiles: false };
	return { ...f, rows: f.rows || (kind === "files" ? 8 : 5), allowFiles: kind === "files" };
}

/** Strips client-only keys so the draft can be sent to the API. */
export function detailsPayload(d: AgentDetailsDraft) {
	return {
		...d,
		fields: d.fields.map((f): TaskField => ({
			id: f.id,
			label: f.label,
			placeholder: f.placeholder,
			required: f.required,
			rows: f.rows,
			allowFiles: f.allowFiles,
		})),
	};
}

export function AgentDetailsEditor(props: {
	value: AgentDetailsDraft;
	onChange: (next: AgentDetailsDraft) => void;
	categories: string[];
	idPrefix: string;
	disabled?: boolean;
}) {
	const { value, onChange, idPrefix } = props;
	const set = (patch: Partial<AgentDetailsDraft>) => onChange({ ...value, ...patch });
	const setField = (key: string, patch: Partial<FieldDraft> | ((f: FieldDraft) => FieldDraft)) =>
		set({
			fields: value.fields.map((f) => (f.key === key ? (typeof patch === "function" ? patch(f) : { ...f, ...patch }) : f)),
		});
	const moveField = (index: number, delta: number) => {
		const next = [...value.fields];
		const [item] = next.splice(index, 1);
		next.splice(index + delta, 0, item);
		set({ fields: next });
	};

	return (
		<fieldset disabled={props.disabled} className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px_180px]">
				<div className="space-y-1.5">
					<label htmlFor={`${idPrefix}-name`} className="field-label">
						Name<span className="ml-1 text-accent">*</span>
					</label>
					<input
						id={`${idPrefix}-name`}
						className="input"
						maxLength={60}
						value={value.name}
						placeholder="e.g. API Contract Review"
						onChange={(e) => set({ name: e.target.value })}
					/>
				</div>
				<div className="space-y-1.5">
					<label htmlFor={`${idPrefix}-code`} className="field-label">
						Code
					</label>
					<input
						id={`${idPrefix}-code`}
						className="input font-mono uppercase"
						maxLength={4}
						value={value.code}
						placeholder="AUTO"
						onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
					/>
				</div>
				<div className="space-y-1.5">
					<label htmlFor={`${idPrefix}-category`} className="field-label">
						Category
					</label>
					<input
						id={`${idPrefix}-category`}
						className="input"
						maxLength={30}
						list={`${idPrefix}-categories`}
						value={value.category}
						placeholder="Custom"
						onChange={(e) => set({ category: e.target.value })}
					/>
					<datalist id={`${idPrefix}-categories`}>
						{props.categories.map((c) => (
							<option key={c} value={c} />
						))}
					</datalist>
				</div>
			</div>

			<div className="space-y-1.5">
				<label htmlFor={`${idPrefix}-description`} className="field-label">
					Description
				</label>
				<input
					id={`${idPrefix}-description`}
					className="input"
					maxLength={240}
					value={value.description}
					placeholder="One line on what this agent produces."
					onChange={(e) => set({ description: e.target.value })}
				/>
			</div>

			<div className="space-y-2">
				<div className="flex items-end justify-between gap-3">
					<p className="field-label">Input fields</p>
					<button
						type="button"
						className="font-mono text-[11px] text-muted transition hover:text-accent disabled:opacity-50"
						disabled={value.fields.length >= 12}
						onClick={() => set({ fields: [...value.fields, blankField()] })}
					>
						+ add field
					</button>
				</div>
				<p className="text-xs text-faint">
					What the user fills in before generating. Each field is sent to the model under its label as a heading.
				</p>
				<ul className="space-y-2">
					{value.fields.map((field, i) => (
						<li key={field.key} className="space-y-2 rounded-lg border border-line bg-black/20 p-3">
							<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
								<input
									aria-label={`Field ${i + 1} label`}
									className="input"
									maxLength={80}
									value={field.label}
									placeholder={`Field ${i + 1} label, e.g. "Feature description"`}
									onChange={(e) => setField(field.key, { label: e.target.value })}
								/>
								<select
									aria-label={`Field ${i + 1} type`}
									className="input"
									value={kindOf(field)}
									onChange={(e) => setField(field.key, (f) => withKind(f, e.target.value as FieldKind))}
								>
									<option value="line">Single line</option>
									<option value="text">Multi-line text</option>
									<option value="files">Multi-line + files</option>
								</select>
							</div>
							<input
								aria-label={`Field ${i + 1} placeholder`}
								className="input text-xs"
								maxLength={200}
								value={field.placeholder ?? ""}
								placeholder="Placeholder / hint (optional)"
								onChange={(e) => setField(field.key, { placeholder: e.target.value })}
							/>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
									<input
										type="checkbox"
										className="accent-accent"
										checked={Boolean(field.required)}
										onChange={(e) => setField(field.key, { required: e.target.checked })}
									/>
									Required
								</label>
								<div className="flex gap-1 font-mono text-[11px]">
									<button
										type="button"
										className="rounded px-1.5 py-0.5 text-muted hover:text-fg disabled:opacity-30"
										disabled={i === 0}
										aria-label={`Move field ${i + 1} up`}
										onClick={() => moveField(i, -1)}
									>
										↑
									</button>
									<button
										type="button"
										className="rounded px-1.5 py-0.5 text-muted hover:text-fg disabled:opacity-30"
										disabled={i === value.fields.length - 1}
										aria-label={`Move field ${i + 1} down`}
										onClick={() => moveField(i, 1)}
									>
										↓
									</button>
									<button
										type="button"
										className="rounded px-1.5 py-0.5 text-muted hover:text-danger disabled:opacity-30"
										disabled={value.fields.length <= 1}
										onClick={() => set({ fields: value.fields.filter((f) => f.key !== field.key) })}
									>
										remove
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			</div>
		</fieldset>
	);
}
