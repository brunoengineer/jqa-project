import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { NavLink } from "@/components/NavLink";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "QA Lobby",
	description: "Local-first QA agent workspace for generating Markdown QA documents",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
				<header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
					<div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
						<Link href="/projects" className="group flex items-center gap-2.5">
							<span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 font-mono text-[11px] font-bold text-black shadow-[0_0_20px_-4px] shadow-accent/60">
								QA
							</span>
							<span className="text-[15px] font-semibold tracking-tight">QA Lobby</span>
						</Link>

						<nav className="flex items-center gap-1">
							<NavLink href="/projects">Projects</NavLink>
							<NavLink href="/prompts">Agents</NavLink>
						</nav>

						<span className="hidden items-center gap-2 font-mono text-[11px] text-muted sm:flex">
							<span className="relative flex size-2">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-ok/60" />
								<span className="relative inline-flex size-2 rounded-full bg-ok" />
							</span>
							local · 127.0.0.1
						</span>
					</div>
				</header>

				<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
			</body>
		</html>
	);
}
