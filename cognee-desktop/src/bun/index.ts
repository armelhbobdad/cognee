import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import Electrobun, { ApplicationMenu, BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import type { AppConfig, AppRPCSchema, SetupState } from "shared/rpc";

// ─── App data layout ─────────────────────────────────────────────────────
const XDG_CONFIG_HOME =
	process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.length > 0
		? process.env.XDG_CONFIG_HOME
		: join(homedir(), ".config");
const CONFIG_DIR = join(XDG_CONFIG_HOME, "cognee-desktop");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const APP_DATA_DIR = join(homedir(), ".cognee-desktop");
const PYTHON_DIR = join(APP_DATA_DIR, "python");
const PYTHON_SRC_DIR = join(APP_DATA_DIR, "python-src");
const VENV_DIR = join(PYTHON_DIR, ".venv");
const VENV_PYTHON = join(VENV_DIR, "bin", "python");
const VENV_PIP = join(VENV_DIR, "bin", "pip");
const BACKEND_PORT_START = 8765;
const HTTPS_URL_PATTERN = /^https?:\/\//i;

for (const dir of [APP_DATA_DIR, PYTHON_DIR, CONFIG_DIR]) {
	mkdirSync(dir, { recursive: true });
}

const DEFAULT_CONFIG: AppConfig = {
	firstRunCompleted: false,
};

function readConfig(): AppConfig {
	if (!existsSync(CONFIG_FILE)) {
		return { ...DEFAULT_CONFIG };
	}
	try {
		const raw = readFileSync(CONFIG_FILE, "utf-8");
		const parsed = JSON.parse(raw) as Partial<AppConfig>;
		return { ...DEFAULT_CONFIG, ...parsed };
	} catch (err) {
		console.error("[config] read failed; using defaults:", err);
		return { ...DEFAULT_CONFIG };
	}
}

function writeConfig(next: AppConfig) {
	writeFileSync(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}

let appConfig: AppConfig = readConfig();

// ─── State ───────────────────────────────────────────────────────────────
let setupState: SetupState = {
	uvInstalled: false,
	pythonInstalled: false,
	depsInstalled: false,
	backendRunning: false,
};

let backendProcess: Bun.Subprocess | null = null;
let backendPort = BACKEND_PORT_START;

function publishSetupState() {
	mainWindow?.webview.rpc?.send.setupStateChanged(setupState);
}

function setStep(step: SetupState["currentStep"]) {
	setupState = { ...setupState, currentStep: step };
	publishSetupState();
}

// ─── Shell helper ────────────────────────────────────────────────────────
interface RunResult {
	error: string;
	output: string;
	success: boolean;
}

async function runCommand(
	cmd: string,
	args: string[],
	options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<RunResult> {
	try {
		const proc = Bun.spawn([cmd, ...args], {
			cwd: options.cwd,
			env: { ...process.env, ...(options.env ?? {}) },
			stdout: "pipe",
			stderr: "pipe",
		});
		const [output, error] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);
		const exitCode = await proc.exited;
		return { success: exitCode === 0, output, error };
	} catch (err) {
		return { success: false, output: "", error: String(err) };
	}
}

// ─── uv detection / install ──────────────────────────────────────────────
const UV_CANDIDATE_PATHS = [join(homedir(), ".local", "bin", "uv"), "/usr/local/bin/uv"];

async function getUvPath(): Promise<string | null> {
	const which = await runCommand("which", ["uv"]);
	if (which.success && which.output.trim()) {
		return which.output.trim();
	}
	for (const p of UV_CANDIDATE_PATHS) {
		if (existsSync(p)) {
			return p;
		}
	}
	return null;
}

async function checkUvInstalled(): Promise<boolean> {
	return (await getUvPath()) !== null;
}

async function installUv(): Promise<boolean> {
	const result = await runCommand("sh", ["-c", "curl -LsSf https://astral.sh/uv/install.sh | sh"]);
	if (!result.success) {
		console.error("[setup] uv install failed:", result.error);
		return false;
	}
	return await checkUvInstalled();
}

// ─── Python venv ─────────────────────────────────────────────────────────
async function setupPythonEnvironment(): Promise<boolean> {
	if (existsSync(VENV_PYTHON)) {
		return true;
	}
	const uvPath = await getUvPath();
	if (!uvPath) {
		return false;
	}
	const result = await runCommand(uvPath, ["venv", "--python", "3.11", VENV_DIR]);
	if (!result.success) {
		console.error("[setup] uv venv failed:", result.error);
		return false;
	}
	return existsSync(VENV_PYTHON);
}

// ─── Resolve bundled python source ───────────────────────────────────────
function resolvePythonSourceDir(): string | null {
	const candidates = [
		join(import.meta.dir, "..", "python"), // packaged: app/bun/../python
		join(process.cwd(), "python"), // dev: project root
		PYTHON_SRC_DIR, // already copied
	];
	for (const candidate of candidates) {
		if (existsSync(join(candidate, "requirements.txt"))) {
			return candidate;
		}
	}
	return null;
}

// ─── Install python dependencies ─────────────────────────────────────────
async function installPythonDependencies(): Promise<boolean> {
	const sourceDir = resolvePythonSourceDir();
	if (!sourceDir) {
		console.error("[setup] python source dir not found");
		return false;
	}

	mkdirSync(PYTHON_SRC_DIR, { recursive: true });
	for (const file of ["requirements.txt", "server.py"]) {
		const from = join(sourceDir, file);
		const to = join(PYTHON_SRC_DIR, file);
		if (existsSync(from)) {
			copyFileSync(from, to);
		}
	}

	const uvPath = await getUvPath();
	if (!uvPath) {
		return false;
	}

	const uvInstall = await runCommand(
		uvPath,
		["pip", "install", "-r", "requirements.txt", "--python", VENV_PYTHON],
		{ cwd: PYTHON_SRC_DIR }
	);
	if (uvInstall.success) {
		return true;
	}

	console.warn("[setup] uv pip install failed, falling back to raw pip");

	const rawPip = await runCommand(VENV_PIP, ["install", "-r", "requirements.txt"], {
		cwd: PYTHON_SRC_DIR,
	});
	if (!rawPip.success) {
		console.error("[setup] pip install failed:", rawPip.error);
		return false;
	}
	return true;
}

// ─── Free port discovery ─────────────────────────────────────────────────
function findFreePort(start: number): number {
	for (let port = start; port < start + 100; port++) {
		try {
			const server = Bun.listen({
				hostname: "127.0.0.1",
				port,
				// data is unused — this is a probe, we close immediately.
				socket: { data: () => undefined },
			});
			server.stop();
			return port;
		} catch {
			// next
		}
	}
	throw new Error(`No free port in range ${start}-${start + 99}`);
}

// ─── Backend lifecycle ───────────────────────────────────────────────────
async function getCertifiPath(): Promise<string | null> {
	const result = await runCommand(VENV_PYTHON, ["-c", "import certifi; print(certifi.where())"]);
	if (!result.success) {
		return null;
	}
	const path = result.output.trim();
	return existsSync(path) ? path : null;
}

async function pollHealth(port: number): Promise<boolean> {
	for (let attempt = 0; attempt < 30; attempt++) {
		try {
			const r = await fetch(`http://127.0.0.1:${port}/health`);
			if (r.ok) {
				return true;
			}
		} catch {
			// not ready yet
		}
		await Bun.sleep(1000);
	}
	return false;
}

function streamLogs(
	stream: ReadableStream<Uint8Array> | number | undefined,
	tag: "stdout" | "stderr"
) {
	if (!stream || typeof stream === "number") {
		return;
	}
	const decoder = new TextDecoder();
	(async () => {
		for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
			const text = decoder.decode(chunk, { stream: true });
			if (text) {
				mainWindow?.webview.rpc?.send.backendLog({ stream: tag, text });
			}
		}
	})().catch((err) => {
		console.error(`[stream:${tag}] reader failed:`, err);
	});
}

async function startBackend(): Promise<boolean> {
	const serverPath = join(PYTHON_SRC_DIR, "server.py");
	if (!(existsSync(VENV_PYTHON) && existsSync(serverPath))) {
		return false;
	}

	const sslCertFile = await getCertifiPath();
	backendPort = findFreePort(BACKEND_PORT_START);

	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		PORT: String(backendPort),
		PYTHONUNBUFFERED: "1",
	};
	if (sslCertFile) {
		env.SSL_CERT_FILE = sslCertFile;
		env.REQUESTS_CA_BUNDLE = sslCertFile;
	}

	backendProcess = Bun.spawn([VENV_PYTHON, serverPath], {
		cwd: PYTHON_SRC_DIR,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});

	streamLogs(backendProcess.stdout, "stdout");
	streamLogs(backendProcess.stderr, "stderr");

	const ready = await pollHealth(backendPort);
	if (!ready) {
		console.error("[setup] /health did not respond within 30s");
		await stopBackend();
		return false;
	}
	console.log(`[setup] sidecar ready on http://127.0.0.1:${backendPort}`);
	return true;
}

async function stopBackend(): Promise<void> {
	if (!backendProcess) {
		return;
	}
	const proc = backendProcess;
	backendProcess = null;
	try {
		proc.kill();
		const exited = await Promise.race([
			proc.exited.then(() => true),
			new Promise<false>((r) => setTimeout(() => r(false), 3000)),
		]);
		if (!exited) {
			proc.kill(9);
			await proc.exited;
		}
	} catch (err) {
		console.error("[setup] stopBackend error:", err);
	}
}

// ─── Setup orchestration ─────────────────────────────────────────────────
async function runSetup(): Promise<SetupState> {
	setupState = {
		uvInstalled: false,
		pythonInstalled: false,
		depsInstalled: false,
		backendRunning: false,
	};
	publishSetupState();

	setStep("uv");
	setupState.uvInstalled = (await checkUvInstalled()) || (await installUv());
	if (!setupState.uvInstalled) {
		setupState.error = "Failed to install uv package manager";
		publishSetupState();
		return setupState;
	}

	setStep("python");
	setupState.pythonInstalled = await setupPythonEnvironment();
	if (!setupState.pythonInstalled) {
		setupState.error = "Failed to set up Python environment";
		publishSetupState();
		return setupState;
	}

	setStep("deps");
	setupState.depsInstalled = await installPythonDependencies();
	if (!setupState.depsInstalled) {
		setupState.error = "Failed to install Python dependencies";
		publishSetupState();
		return setupState;
	}

	setStep("backend");
	setupState.backendRunning = await startBackend();
	if (!setupState.backendRunning) {
		setupState.error = "Failed to start backend server";
		publishSetupState();
		return setupState;
	}

	setupState = { ...setupState, currentStep: undefined, error: undefined };
	publishSetupState();
	return setupState;
}

// ─── HMR vs bundled view URL ─────────────────────────────────────────────
async function getMainViewUrl(): Promise<string> {
	try {
		const response = await fetch("http://localhost:5173");
		if (response.ok) {
			return "http://localhost:5173";
		}
	} catch {
		// Vite dev server not running, use bundled views
	}
	return "views://mainview/index.html";
}

// ─── Application menu (Linux ignores; cross-platform parity) ─────────────
ApplicationMenu.setApplicationMenu([
	{
		submenu: [
			{ label: "About Cognee Desktop", role: "about" },
			{ type: "separator" },
			{ label: "Quit", role: "quit", accelerator: "q" },
		],
	},
	{
		label: "Edit",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "separator" },
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
			{ role: "selectAll" },
		],
	},
]);

// ─── RPC handlers ────────────────────────────────────────────────────────
const mainRPC = BrowserView.defineRPC<AppRPCSchema>({
	maxRequestTime: 60_000,
	handlers: {
		requests: {
			ping: () => "pong",
			getSetupState: () => setupState,
			runSetup: () => runSetup(),
			getConfig: () => appConfig,
			updateConfig: (patch) => {
				appConfig = { ...appConfig, ...patch };
				try {
					writeConfig(appConfig);
				} catch (err) {
					console.error("[config] write failed:", err);
				}
				return appConfig;
			},
			openExternal: async ({ url }) => {
				if (!HTTPS_URL_PATTERN.test(url)) {
					return { ok: false };
				}
				const result = await runCommand("xdg-open", [url]);
				return { ok: result.success };
			},
			backendRequest: async ({ method, path, body }) => {
				if (!setupState.backendRunning) {
					return {
						status: 503,
						data: { error: "backend not running" },
					};
				}
				const url = `http://127.0.0.1:${backendPort}${path}`;
				const init: RequestInit = { method };
				if (body !== undefined) {
					init.body = JSON.stringify(body);
					init.headers = { "Content-Type": "application/json" };
				}
				try {
					const response = await fetch(url, init);
					const text = await response.text();
					let data: unknown = text;
					try {
						data = JSON.parse(text);
					} catch {
						// non-JSON, leave as text
					}
					return { status: response.status, data };
				} catch (err) {
					return {
						status: 599,
						data: { error: String(err) },
					};
				}
			},
		},
		messages: {
			log: ({ msg }) => {
				console.log("[Webview]:", msg);
			},
		},
	},
});

// ─── Window + lifecycle ──────────────────────────────────────────────────
const mainWindow = new BrowserWindow<typeof mainRPC>({
	title: "Cognee Desktop",
	url: await getMainViewUrl(),
	frame: { width: 1200, height: 800, x: 100, y: 100 },
	rpc: mainRPC,
});

mainWindow.on("close", async () => {
	console.log("[lifecycle] window close — graceful shutdown");
	await stopBackend();
	Utils.quit();
});

Electrobun.events.on("before-quit", () => {
	console.log("[lifecycle] before-quit safety net");
	if (backendProcess) {
		try {
			backendProcess.kill(9);
		} catch {
			// already dead
		}
	}
});

mainWindow.webview.on("dom-ready", () => {
	console.log("[lifecycle] DOM ready — kicking off setup");
	runSetup().catch((err) => {
		console.error("[lifecycle] runSetup crashed:", err);
	});
});

console.log("cognee-desktop bun-process started");
