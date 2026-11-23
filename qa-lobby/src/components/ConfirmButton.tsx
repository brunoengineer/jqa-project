"use client";

import { useEffect, useState } from "react";

/** Button that asks for a second click before running `onConfirm`. */
export function ConfirmButton(props: {
	onConfirm: () => void;
	label?: string;
	confirmLabel?: string;
	disabled?: boolean;
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
			type="button"
			disabled={props.disabled}
			onClick={() => {
				if (!armed) {
					setArmed(true);
					return;
				}
				setArmed(false);
				props.onConfirm();
			}}
			className={`${armed ? "btn-danger" : "btn-ghost"} px-3 py-1.5 text-xs ${props.className ?? ""}`}
		>
			{armed ? (props.confirmLabel ?? "Confirm delete") : (props.label ?? "Delete")}
		</button>
	);
}
