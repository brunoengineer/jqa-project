#!/usr/bin/env node
// Creates a "QA Lobby" shortcut that opens the app in its own window (see desktop/main.mjs).
//
// Usage: npm run desktop:shortcut                  → shortcut on the Desktop
//        npm run desktop:shortcut -- --start-menu   → also add it to the Start menu
//
// Windows only. The shortcut points at this folder, so run the command again if you move
// the project or reinstall Node.js.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.platform !== "win32") {
	console.error("Desktop shortcuts are only created on Windows. Start the app with: npm run desktop");
	process.exit(1);
}

// Resolving the electron package returns the path to electron.exe (and downloads it if missing).
const electronExe = require("electron");

// Values go through environment variables so paths with spaces or quotes need no escaping.
const ps = `
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
$folders = @([Environment]::GetFolderPath('Desktop'))
if ($env:QA_START_MENU -eq '1') { $folders += [Environment]::GetFolderPath('Programs') }
foreach ($folder in $folders) {
	$lnkPath = Join-Path $folder 'QA Lobby.lnk'
	$lnk = $shell.CreateShortcut($lnkPath)
	$lnk.TargetPath = $env:QA_ELECTRON
	$lnk.Arguments = '"' + $env:QA_MAIN + '" "--node=' + $env:QA_NODE + '"'
	$lnk.WorkingDirectory = $env:QA_ROOT
	$lnk.IconLocation = $env:QA_ICON + ',0'
	$lnk.Description = 'QA Lobby - local QA agent workspace'
	$lnk.Save()
	Write-Output $lnkPath
}
`;

const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
	encoding: "utf8",
	env: {
		...process.env,
		QA_ELECTRON: electronExe,
		QA_MAIN: path.join(appRoot, "desktop", "main.mjs"),
		QA_NODE: process.execPath,
		QA_ROOT: appRoot,
		QA_ICON: path.join(appRoot, "desktop", "icon.ico"),
		QA_START_MENU: process.argv.includes("--start-menu") ? "1" : "0",
	},
});

if (result.status !== 0) {
	console.error(result.stderr || result.error?.message || "Could not create the shortcut.");
	process.exit(1);
}
for (const line of result.stdout.trim().split(/\r?\n/)) console.log(`✓ Created ${line}`);
console.log("\nDouble-click it to open QA Lobby. The first launch builds the app, which takes about a minute.");
