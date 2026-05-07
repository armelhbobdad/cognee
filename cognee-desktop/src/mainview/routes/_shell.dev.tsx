import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { electrobun } from "@/lib/electrobun";
import { useAppStore } from "@/store/app-store";

const STEP_LABELS = {
	uv: "Locating uv",
	python: "Creating Python environment",
	deps: "Installing Python dependencies",
	backend: "Starting sidecar",
} as const;

type HealthState =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "ok"; payload: unknown }
	| { kind: "error"; message: string };

function DevRoute() {
	const setupState = useAppStore((s) => s.setupState);
	const setSetupState = useAppStore((s) => s.setSetupState);
	const [health, setHealth] = useState<HealthState>({ kind: "idle" });

	const probeHealth = useCallback(async () => {
		setHealth({ kind: "loading" });
		try {
			const response = await electrobun.rpc?.request.backendRequest({
				method: "GET",
				path: "/health",
			});
			if (!response) {
				setHealth({ kind: "error", message: "RPC unavailable" });
				return;
			}
			if (response.status === 200) {
				setHealth({ kind: "ok", payload: response.data });
			} else {
				setHealth({ kind: "error", message: `HTTP ${response.status}` });
			}
		} catch (err) {
			setHealth({ kind: "error", message: String(err) });
		}
	}, []);

	const retrySetup = useCallback(async () => {
		const next = await electrobun.rpc?.request.runSetup({});
		if (next) {
			setSetupState(next);
		}
	}, [setSetupState]);

	const stepLabel = setupState?.currentStep ? STEP_LABELS[setupState.currentStep] : null;

	return (
		<div className="mx-auto flex max-w-[42rem] flex-col gap-6 p-8">
			<header>
				<h1 className="font-semibold text-2xl">Developer panel</h1>
				<p className="text-muted-foreground text-sm">Sidecar lifecycle and runtime probes.</p>
			</header>

			<section className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
				<h2 className="font-medium text-sm">Sidecar status</h2>
				{setupState ? (
					<ul className="space-y-1 text-sm">
						<StatusRow done={setupState.uvInstalled} label="uv installed" />
						<StatusRow done={setupState.pythonInstalled} label="Python environment" />
						<StatusRow done={setupState.depsInstalled} label="Dependencies" />
						<StatusRow done={setupState.backendRunning} label="Sidecar running" />
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">Connecting…</p>
				)}
				{stepLabel ? <p className="text-muted-foreground text-sm">{stepLabel}…</p> : null}
				{setupState?.error ? (
					<div className="flex flex-col gap-2">
						<p className="text-destructive text-sm">{setupState.error}</p>
						<Button onClick={retrySetup} size="sm" variant="outline">
							Retry
						</Button>
					</div>
				) : null}
			</section>

			<section className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
				<div className="flex items-center justify-between">
					<h2 className="font-medium text-sm">Health probe</h2>
					<Button
						disabled={!setupState?.backendRunning || health.kind === "loading"}
						onClick={probeHealth}
						size="sm"
					>
						{health.kind === "loading" ? "Checking…" : "Probe /health"}
					</Button>
				</div>
				<HealthDisplay state={health} />
			</section>
		</div>
	);
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
	return (
		<li className="flex items-center gap-2">
			<span
				className={`inline-block size-2 rounded-full ${
					done ? "bg-primary" : "bg-muted-foreground/40"
				}`}
			/>
			<span className={done ? "" : "text-muted-foreground"}>{label}</span>
		</li>
	);
}

function HealthDisplay({ state }: { state: HealthState }) {
	if (state.kind === "idle") {
		return (
			<p className="text-muted-foreground text-sm">Click Probe /health once setup completes.</p>
		);
	}
	if (state.kind === "loading") {
		return <p className="text-muted-foreground text-sm">Probing…</p>;
	}
	if (state.kind === "error") {
		return <p className="text-destructive text-sm">{state.message}</p>;
	}
	return (
		<pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
			{JSON.stringify(state.payload, null, 2)}
		</pre>
	);
}

export const Route = createFileRoute("/_shell/dev")({
	component: DevRoute,
});
