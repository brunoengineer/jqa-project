import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  description: "Local-only QA assistant for generating markdown documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-dvh`}
      >
        <div className="min-h-dvh">
          <header className="border-b border-black/[.08] dark:border-white/10">
            <div className="mx-auto max-w-5xl px-6 py-5">
        <div className="flex items-center justify-between gap-4">
        <Link href="/projects" className="text-lg font-semibold tracking-tight">
          QA Lobby
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/prompts" className="text-sm text-foreground/80 hover:text-foreground">
            AI Prompts
          </Link>
        </nav>
        </div>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
