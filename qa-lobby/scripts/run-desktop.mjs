#!/usr/bin/env node
// `npm run desktop`: starts the desktop app (desktop/main.mjs) in Electron.
//
// Launched through this script rather than `electron` directly so that:
// - ELECTRON_RUN_AS_NODE is cleared. Terminals started by editors such as VS Code can inherit it,
//   and it makes Electron run as plain Node.js, without a window.
// - The app server runs on the same Node.js as npm (passed as --node).

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Resolving the electron package returns the path to its executable (downloading it if missing).
const electronExe = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;

const child = spawn(electronExe, [path.join(appRoot, "desktop", "main.mjs"), `--node=${process.execPath}`], {
	cwd: appRoot,
	env,
	stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
