// QA Lobby desktop app: runs the Next.js app locally and shows it in its own window.
//
//   npm run desktop            start it from a terminal (via scripts/run-desktop.mjs)
//   npm run desktop:shortcut   create a desktop icon that starts it
//
// The app runs from this folder exactly like `npm run dev` does, so it uses the same data/
// (projects, documents, agents), the same .env.local, and the same provider sign-ins. It builds
// a production bundle into .next-desktop/ on first launch and again whenever the source changes,
// then serves it with `next start` on a free local port. Closing the window stops the server.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, Menu, nativeTheme, shell } from "electron";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = ".next-desktop";
const NEXT_BIN = path.join(APP_ROOT, "node_modules", "next", "dist", "bin", "next");
const ICON = path.join(APP_ROOT, "desktop", "icon.png");
const LOG_PATH = path.join(APP_ROOT, "data", "logs", "desktop.log");

// Files that end up in the compiled app. prompts/ and data/ are read at runtime, so editing them
// doesn't need a rebuild.
const BUILD_INPUTS = [
	"src",
	"public",
	"next.config.ts",
	"package.json",
	"package-lock.json",
	"postcss.config.mjs",
	"tsconfig.json",
];

/** @type {import("node:child_process").ChildProcess | null} */
let server = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {BrowserWindow | null} */
let splash = null;
let quitting = false;
/** @type {fs.WriteStream | null} */
let log = null;

// ---------------------------------------------------------------------------
// Helpers

/**
 * The Node.js that runs Next.js. The app's native dependencies are built for the system Node,
 * not Electron's, so the server runs as a separate process: --node=<path> (set by the desktop
 * shortcut), then the Node that launched `npm run desktop`, then `node` from PATH.
 */
function resolveNode() {
	const arg = process.argv.find((a) => a.startsWith("--node="));
	return arg?.slice("--node=".length) || process.env.npm_node_execpath || "node";
}

function writeLog(text) {
	log?.write(text.endsWith("\n") ? text : `${text}\n`);
}

function newestMtime(target) {
	let stat;
	try {
		stat = fs.statSync(target);
	} catch {
		return 0;
	}
	if (!stat.isDirectory()) return stat.mtimeMs;
	let newest = stat.mtimeMs;
	for (const entry of fs.readdirSync(target)) {
		newest = Math.max(newest, newestMtime(path.join(target, entry)));
	}
	return newest;
}

function needsBuild() {
	let builtAt;
	try {
		builtAt = fs.statSync(path.join(APP_ROOT, DIST_DIR, "BUILD_ID")).mtimeMs;
	} catch {
		return true;
	}
	return BUILD_INPUTS.some((p) => newestMtime(path.join(APP_ROOT, p)) > builtAt);
}

function freePort() {
	return new Promise((resolve, reject) => {
		const srv = net.createServer();
		srv.unref();
		srv.on("error", reject);
		srv.listen(0, "127.0.0.1", () => {
			const { port } = /** @type {net.AddressInfo} */ (srv.address());
			srv.close(() => resolve(port));
		});
	});
}

function runNext(args) {
	writeLog(`\n$ next ${args.join(" ")}`);
	const child = spawn(resolveNode(), [NEXT_BIN, ...args], {
		cwd: APP_ROOT,
		env: { ...process.env, QA_LOBBY_DIST_DIR: DIST_DIR, ELECTRON_RUN_AS_NODE: undefined },
		stdio: ["ignore", "pipe", "pipe"],
		windowsHide: true,
	});
	child.stdout.on("data", (d) => writeLog(String(d)));
	child.stderr.on("data", (d) => writeLog(String(d)));
	return child;
}

function build() {
	return new Promise((resolve, reject) => {
		const child = runNext(["build"]);
		child.on("error", (e) => reject(new Error(`Could not run Node.js (${resolveNode()}): ${e.message}`)));
		child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`The build failed (exit code ${code}).`))));
	});
}

async function waitForServer(url, child) {
	let exited = null;
	child.once("exit", (code) => (exited = code));
	child.once("error", (e) => (exited = e.message));
	const deadline = Date.now() + 90_000;
	while (Date.now() < deadline) {
		if (exited !== null) throw new Error(`The server stopped during startup (${exited}).`);
		try {
			await fetch(url, { signal: AbortSignal.timeout(2000) });
			return;
		} catch {
			await new Promise((r) => setTimeout(r, 300));
		}
	}
	throw new Error("The server did not start within 90 seconds.");
}

/** Kills the server and the processes it started (provider CLIs, etc.). */
function stopServer() {
	if (!server || server.exitCode !== null || !server.pid) return;
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { windowsHide: true });
	} else {
		server.kill("SIGTERM");
	}
	server = null;
}

// ---------------------------------------------------------------------------
// Windows

function splashHtml(message) {
	return `<!doctype html><html><head><meta charset="utf-8"><style>
		html,body{margin:0;height:100%;background:#07080c;color:#e7e9ef;font:14px system-ui,sans-serif;-webkit-user-select:none}
		body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:0 28px;box-sizing:border-box}
		.logo{width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#22d3ee,#a78bfa);display:grid;place-items:center;font:800 17px Consolas,monospace;color:#07080c}
		p{margin:0;color:#8a90a2;font-size:12.5px;line-height:1.5}
		.bar{width:160px;height:2px;background:rgba(34,211,238,.12);overflow:hidden;border-radius:2px}
		.bar i{display:block;width:40%;height:100%;background:#22d3ee;animation:s 1.2s ease-in-out infinite}
		@keyframes s{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
	</style></head><body><div class="logo">QA</div><strong>QA Lobby</strong><p id="m">${message}</p><div class="bar"><i></i></div></body></html>`;
}

function showSplash(message) {
	splash = new BrowserWindow({
		width: 380,
		height: 240,
		frame: false,
		resizable: false,
		center: true,
		backgroundColor: "#07080c",
		icon: ICON,
		title: "QA Lobby",
	});
	// Closing the splash before the app is up (e.g. Alt+F4 during a build) cancels the launch.
	splash.on("closed", () => {
		splash = null;
		if (!mainWindow) app.quit();
	});
	void splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(message))}`);
}

function setSplashMessage(message) {
	void splash?.webContents.executeJavaScript(`document.getElementById("m").textContent = ${JSON.stringify(message)}`);
}

// ---------------------------------------------------------------------------
// Zoom (Ctrl + mouse wheel, Ctrl +/-/0, View menu)
//
// Chromium remembers zoom per origin, and the app gets a new port on every launch, so the level
// is kept in data/desktop.json instead. Levels are Chromium's: 0 = 100%, each step ≈ ×1.1.

const SETTINGS_PATH = path.join(APP_ROOT, "data", "desktop.json");
const ZOOM_STEP = 0.5;
const ZOOM_MIN = -3; // ≈ 50%
const ZOOM_MAX = 4.5; // ≈ 225%

function readSettings() {
	try {
		return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
	} catch {
		return {};
	}
}

function writeSettings(patch) {
	try {
		fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
		fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...readSettings(), ...patch }, null, 2));
	} catch (e) {
		writeLog(`Could not save desktop settings: ${e instanceof Error ? e.message : e}`);
	}
}

let zoomLevel = (() => {
	const saved = Number(readSettings().zoomLevel);
	return Number.isFinite(saved) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, saved)) : 0;
})();

function setZoom(level) {
	zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(level / ZOOM_STEP) * ZOOM_STEP));
	mainWindow?.webContents.setZoomLevel(zoomLevel);
	writeSettings({ zoomLevel });
}

const zoomIn = () => setZoom(zoomLevel + ZOOM_STEP);
const zoomOut = () => setZoom(zoomLevel - ZOOM_STEP);

function createMainWindow(origin) {
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 920,
		minWidth: 900,
		minHeight: 600,
		show: false,
		title: "QA Lobby",
		icon: ICON,
		backgroundColor: "#07080c",
		autoHideMenuBar: true,
		webPreferences: { contextIsolation: true, sandbox: true },
	});

	// Links to other sites (docs, PRs, Jira) open in the default browser, not inside the app.
	const isAppUrl = (url) => url === origin || url.startsWith(`${origin}/`);
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (!isAppUrl(url)) void shell.openExternal(url);
		return { action: "deny" };
	});
	mainWindow.webContents.on("will-navigate", (event, url) => {
		if (!isAppUrl(url)) {
			event.preventDefault();
			void shell.openExternal(url);
		}
	});

	// Ctrl + mouse wheel (and touchpad pinch) is reported here; Electron doesn't zoom on its own.
	mainWindow.webContents.on("zoom-changed", (_event, direction) => (direction === "in" ? zoomIn() : zoomOut()));
	// Re-apply the saved level after every load, since each launch is a new origin.
	mainWindow.webContents.on("did-finish-load", () => mainWindow?.webContents.setZoomLevel(zoomLevel));

	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
		splash?.close();
	});
	mainWindow.on("closed", () => (mainWindow = null));
	void mainWindow.loadURL(`${origin}/projects`);
}

function setMenu() {
	// Hidden menu bar (press Alt to show it) that keeps the usual shortcuts working.
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			{ role: "fileMenu" },
			{ role: "editMenu" },
			{
				label: "View",
				submenu: [
					{ role: "reload" },
					{ role: "forceReload" },
					{ role: "toggleDevTools" },
					{ type: "separator" },
					// Custom items instead of the built-in zoom roles, so the level is saved between launches.
					{ label: "Actual Size", accelerator: "CommandOrControl+0", click: () => setZoom(0) },
					{ label: "Zoom In", accelerator: "CommandOrControl+=", click: zoomIn },
					{ label: "Zoom Out", accelerator: "CommandOrControl+-", click: zoomOut },
					// Same actions on Ctrl+Shift+= ("+") and the numeric keypad.
					{ label: "Zoom In", accelerator: "CommandOrControl+Plus", click: zoomIn, visible: false, acceleratorWorksWhenHidden: true },
					{ label: "Zoom In", accelerator: "CommandOrControl+numadd", click: zoomIn, visible: false, acceleratorWorksWhenHidden: true },
					{ label: "Zoom Out", accelerator: "CommandOrControl+numsub", click: zoomOut, visible: false, acceleratorWorksWhenHidden: true },
					{ label: "Actual Size", accelerator: "CommandOrControl+num0", click: () => setZoom(0), visible: false, acceleratorWorksWhenHidden: true },
					{ type: "separator" },
					{ role: "togglefullscreen" },
				],
			},
			{
				label: "Help",
				submenu: [{ label: "Open log file", click: () => void shell.openPath(LOG_PATH) }],
			},
		]),
	);
}

// ---------------------------------------------------------------------------
// Lifecycle

async function start() {
	// The UI is dark-only; this makes the window title bar and dialogs dark too.
	nativeTheme.themeSource = "dark";
	setMenu();
	fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
	log = fs.createWriteStream(LOG_PATH, { flags: "w" });
	writeLog(`QA Lobby desktop · ${new Date().toISOString()} · node: ${resolveNode()}`);

	showSplash("Starting…");
	try {
		if (needsBuild()) {
			setSplashMessage("Building the app. This happens on first launch and after updates, and takes about a minute.");
			await build();
			setSplashMessage("Starting…");
		}

		const port = await freePort();
		const origin = `http://127.0.0.1:${port}`;
		server = runNext(["start", "-H", "127.0.0.1", "-p", String(port)]);
		await waitForServer(origin, server);

		server.once("exit", (code) => {
			if (quitting) return;
			dialog.showErrorBox("QA Lobby stopped", `The local server exited unexpectedly (code ${code}).\n\nDetails: ${LOG_PATH}`);
			app.quit();
		});
		createMainWindow(origin);
	} catch (e) {
		stopServer();
		splash?.close();
		dialog.showErrorBox(
			"QA Lobby could not start",
			`${e instanceof Error ? e.message : String(e)}\n\nDetails: ${LOG_PATH}`,
		);
		app.quit();
	}
}

if (!app.requestSingleInstanceLock()) {
	// Already running: the other instance focuses its window (see "second-instance").
	app.quit();
} else {
	app.setAppUserModelId("QA Lobby");
	app.on("second-instance", () => {
		const win = mainWindow ?? splash;
		if (!win) return;
		if (win.isMinimized()) win.restore();
		win.focus();
	});
	app.on("window-all-closed", () => {
		// The splash closes itself once the main window is ready; only quit when nothing is left.
		if (!mainWindow && !splash) app.quit();
	});
	app.on("before-quit", () => {
		quitting = true;
		stopServer();
	});
	void app.whenReady().then(start);
}
