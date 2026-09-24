import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ProviderModels } from "./types";

// Runs the Claude Code CLI in headless mode (`claude -p`) with the user's own
// claude.ai login, so generations use their Claude plan instead of API billing.

const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

export const CLAUDE_CODE_MODELS = ["opus", "sonnet", "haiku"];

// Never let the CLI fall back to pay-per-use API credentials from .env.local.
const STRIPPED_ENV = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL"];

const exe = process.platform === "win32" ? "claude.exe" : "claude";

async function isFile(p: string): Promise<boolean> {
	return fs.stat(p).then((s) => s.isFile(), () => false);
}

/** CLAUDE_CODE_PATH → `claude` on PATH → native installer → CLI bundled with the VS Code extension. */
async function findClaudeCli(): Promise<string | null> {
	if (process.env.CLAUDE_CODE_PATH) {
		return (await isFile(process.env.CLAUDE_CODE_PATH)) ? process.env.CLAUDE_CODE_PATH : null;
	}

	for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
		if (await isFile(path.join(dir, exe))) return path.join(dir, exe);
	}

	const home = os.homedir();
	if (await isFile(path.join(home, ".local", "bin", exe))) return path.join(home, ".local", "bin", exe);

	for (const editorDir of [".vscode", ".vscode-insiders", ".cursor"]) {
		const extRoot = path.join(home, editorDir, "extensions");
		const exts = await fs.readdir(extRoot).catch(() => [] as string[]);
		const newestFirst = exts
			.filter((d) => d.startsWith("anthropic.claude-code-"))
			.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
		for (const ext of newestFirst) {
			const candidate = path.join(extRoot, ext, "resources", "native-binary", exe);
			if (await isFile(candidate)) return candidate;
		}
	}
	return null;
}

function childEnv(): NodeJS.ProcessEnv {
	const env = { ...process.env };
	for (const key of STRIPPED_ENV) delete env[key];
	return env;
}

function run(
	cli: string,
	args: string[],
	opts: { stdin?: string; cwd?: string; timeoutMs: number },
): Promise<{ code: number | null; stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(cli, args, { cwd: opts.cwd, env: childEnv(), windowsHide: true });
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`Claude Code timed out after ${Math.round(opts.timeoutMs / 1000)}s`));
		}, opts.timeoutMs);
		child.stdout.on("data", (d) => (stdout += d));
		child.stderr.on("data", (d) => (stderr += d));
		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code, stdout, stderr });
		});
		child.stdin.end(opts.stdin ?? "");
	});
}

type AuthStatus = { loggedIn?: boolean; authMethod?: string; email?: string };

async function getAuthStatus(cli: string): Promise<AuthStatus> {
	const { stdout } = await run(cli, ["auth", "status"], { timeoutMs: 30_000 });
	try {
		return JSON.parse(stdout) as AuthStatus;
	} catch {
		return {};
	}
}

const NOT_FOUND =
	"Claude Code CLI not found — install the Claude Code VS Code extension or CLI, or set CLAUDE_CODE_PATH";
const NOT_SIGNED_IN = "Not signed in — run `claude` once and log in with your Claude account";

export async function listClaudeCodeModels(): Promise<ProviderModels> {
	const cli = await findClaudeCli();
	if (!cli) return { available: false, models: CLAUDE_CODE_MODELS, message: NOT_FOUND };
	try {
		const auth = await getAuthStatus(cli);
		if (!auth.loggedIn) return { available: false, models: CLAUDE_CODE_MODELS, message: NOT_SIGNED_IN };
		const plan = auth.authMethod === "claude.ai" ? "Your Claude plan" : `Signed in via ${auth.authMethod}`;
		return {
			available: true,
			models: CLAUDE_CODE_MODELS,
			message: auth.email ? `${plan} · ${auth.email}` : plan,
		};
	} catch (error) {
		return {
			available: false,
			models: CLAUDE_CODE_MODELS,
			message: error instanceof Error ? error.message : "Claude Code failed to start",
		};
	}
}

type PrintResult = {
	type?: string;
	subtype?: string;
	is_error?: boolean;
	result?: string;
	api_error_status?: number | null;
};

export async function generateWithClaudeCode(input: {
	model: string;
	system?: string;
	prompt: string;
}): Promise<string> {
	const cli = await findClaudeCli();
	if (!cli) throw new Error(`Claude: ${NOT_FOUND}`);

	// Run from an empty directory so no project CLAUDE.md or settings leak into the agent.
	const workDir = path.join(os.tmpdir(), "qa-lobby-claude");
	await fs.mkdir(workDir, { recursive: true });
	const systemFile = path.join(workDir, `system-${crypto.randomUUID()}.md`);

	const args = [
		"-p",
		"--output-format", "json",
		"--model", input.model,
		"--tools", "",
		"--no-session-persistence",
		"--strict-mcp-config",
		"--setting-sources", "",
	];
	if (input.system) {
		await fs.writeFile(systemFile, input.system, "utf8");
		args.push("--system-prompt-file", systemFile);
	}

	let out: Awaited<ReturnType<typeof run>>;
	try {
		// The form input goes over stdin to avoid command-line length limits.
		out = await run(cli, args, { stdin: input.prompt, cwd: workDir, timeoutMs: GENERATION_TIMEOUT_MS });
	} finally {
		await fs.rm(systemFile, { force: true });
	}

	let parsed: PrintResult | null = null;
	try {
		parsed = JSON.parse(out.stdout) as PrintResult;
	} catch {
		// fall through
	}

	if (!parsed) {
		const detail = (out.stderr || out.stdout).trim().slice(0, 500);
		throw new Error(`Claude Code failed (exit ${out.code})${detail ? `: ${detail}` : ""}`);
	}
	if (parsed.is_error || parsed.subtype !== "success") {
		const detail = parsed.result?.trim() || parsed.subtype || "unknown error";
		throw new Error(`Claude: ${detail}`);
	}

	const text = parsed.result ?? "";
	if (!text.trim()) throw new Error("Claude returned an empty response");
	return text;
}
