"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DocumentSelectButton(props: {
	taskId: string;
	outputId: string;
	className?: string;
	children: React.ReactNode;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();

	return (
		<button
			type="button"
			className={props.className}
			onClick={() => {
				const next = new URLSearchParams(searchParams);
				next.set("taskId", props.taskId);
				next.set("outputId", props.outputId);

				router.push(`?${next.toString()}`, { scroll: false });

				// Ensure the output/preview card is aligned to the top.
				// Use auto (no smooth animation) to keep UX minimal.
				setTimeout(() => {
					const el = document.getElementById("preview");
					el?.scrollIntoView({ block: "start", behavior: "auto" });
				}, 0);
			}}
		>
			{props.children}
		</button>
	);
}
