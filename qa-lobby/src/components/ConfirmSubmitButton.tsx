"use client";

import { useEffect, useState } from "react";

/** Submit button that asks for a second click before submitting its form. */
export function ConfirmSubmitButton(props: {
	label?: string;
	confirmLabel?: string;
	className?: string;
}) {
	const [armed, setArmed] = useState(false);

	useEffect(() => {
		if (!armed) return;
		const t = setTimeout(() => setArmed(false), 3000);
		return () => clearTimeout(t);
	}, [armed]);

	return (
		<button
			type="submit"
			onClick={(e) => {
				if (!armed) {
					e.preventDefault();
					setArmed(true);
				}
			}}
			className={`${armed ? "btn-danger" : "btn-ghost"} px-2.5 py-1 text-xs ${props.className ?? ""}`}
		>
			{armed ? (props.confirmLabel ?? "Confirm delete") : (props.label ?? "Delete")}
		</button>
	);
}
