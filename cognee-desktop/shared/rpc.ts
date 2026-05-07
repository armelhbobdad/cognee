import type { RPCSchema } from "electrobun";

export type SetupStep = "uv" | "python" | "deps" | "backend";

export interface SetupState {
	backendRunning: boolean;
	currentStep?: SetupStep;
	depsInstalled: boolean;
	error?: string;
	pythonInstalled: boolean;
	uvInstalled: boolean;
}

export interface BackendRequestParams {
	body?: unknown;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
}

export interface BackendResponse {
	data: unknown;
	status: number;
}

export interface AppConfig {
	firstRunCompleted: boolean;
}

export type LogStream = "stdout" | "stderr";

export interface BackendLogEntry {
	stream: LogStream;
	text: string;
}

export interface AppRPCSchema {
	bun: RPCSchema<{
		requests: {
			ping: { params: Record<string, never>; response: string };
			getSetupState: { params: Record<string, never>; response: SetupState };
			runSetup: { params: Record<string, never>; response: SetupState };
			backendRequest: { params: BackendRequestParams; response: BackendResponse };
			getConfig: { params: Record<string, never>; response: AppConfig };
			updateConfig: { params: Partial<AppConfig>; response: AppConfig };
			openExternal: { params: { url: string }; response: { ok: boolean } };
		};
		messages: {
			log: { msg: string };
		};
	}>;
	webview: RPCSchema<{
		requests: Record<string, never>;
		messages: {
			setupStateChanged: SetupState;
			backendLog: BackendLogEntry;
		};
	}>;
}
