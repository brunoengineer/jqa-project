"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink(props: { href: string; children: React.ReactNode }) {
	const pathname = usePathname();
	const active = pathname === props.href || pathname.startsWith(`${props.href}/`);
	return (
		<Link
			href={props.href}
			className={`rounded-md px-3 py-1.5 text-sm transition ${
				active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
			}`}
		>
			{props.children}
		</Link>
	);
}
