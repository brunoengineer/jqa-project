"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { TaskDefinition } from "@/tasks/registry";

export function TaskSelector(props: {
	tasks: TaskDefinition[];
	selectedTaskId: string;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();

	return (
		<label className="flex items-center gap-3">
			<span className="text-sm font-medium">Task</span>
			<select
				value={props.selectedTaskId}
				onChange={(e) => {
					const next = new URLSearchParams(searchParams);
					next.set("taskId", e.target.value);
					router.push(`?${next.toString()}`);
				}}
				className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:focus:ring-white/20"
			>
				{props.tasks.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</select>
		</label>
	);
}
