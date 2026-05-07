import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { CogneeMark } from "@/components/cognee-mark";
import { electrobun } from "@/lib/electrobun";
import { useAppStore } from "@/store/app-store";

function ModeSelection() {
	const setupState = useAppStore((s) => s.setupState);
	const setMode = useAppStore((s) => s.setMode);
	const navigate = useNavigate();
	const localCtaRef = useRef<HTMLButtonElement>(null);
	const backendRunning = setupState?.backendRunning ?? false;

	useEffect(() => {
		if (backendRunning) {
			localCtaRef.current?.focus();
		}
	}, [backendRunning]);

	const continueLocal = useCallback(async () => {
		setMode("local");
		await electrobun.rpc?.request.updateConfig({ firstRunCompleted: true });
		navigate({ to: "/" });
	}, [navigate, setMode]);

	const cloudPlaceholder = useCallback(() => {
		// 4.2 Cloud sign-in (Auth0 device code) lands later; surface the
		// hand-off path so the CTA isn't a dead button.
		console.warn("Cloud sign-in is not yet wired");
	}, []);

	return (
		<section className="mx-auto flex max-w-[48rem] flex-1 flex-col items-center justify-center gap-6 px-8 py-16 text-center">
			<div className="mb-2 flex items-center gap-3">
				<CogneeMark size={26} />
				<span
					className="font-medium text-foreground tracking-tight"
					style={{ fontFamily: "var(--font-display)", fontSize: 20 }}
				>
					cognee
				</span>
			</div>

			<div className="flex w-full max-w-[42rem] flex-col gap-3">
				<h1
					className="m-0 font-medium text-foreground tracking-tight"
					style={{
						fontFamily: "var(--font-display)",
						fontSize: 32,
						lineHeight: 1.15,
						letterSpacing: "-0.015em",
						textWrap: "balance",
					}}
				>
					How would you like to use cognee?
				</h1>
				<p className="m-0 text-[15px] text-muted-foreground leading-relaxed">
					You can switch later from Settings.
				</p>
			</div>

			<div className="mt-4 grid w-full max-w-[42rem] grid-cols-1 gap-4 md:grid-cols-2">
				<article className="relative flex flex-col gap-2 rounded-lg border-2 border-primary bg-selected p-5 text-left shadow-xs">
					<span className="absolute top-3 right-3 rounded-full border border-primary/20 bg-background px-2 py-0.5 font-semibold text-[11px] text-primary tracking-wide">
						Default
					</span>
					<header className="flex items-center gap-2">
						<h3 className="m-0 font-medium text-base text-foreground">Local</h3>
					</header>
					<p className="m-0 min-h-[2.6rem] text-[13.5px] text-body leading-relaxed">
						Your knowledge stays on this machine. The Python sidecar runs locally.
					</p>
					<div className="mt-2.5">
						<button
							className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-50"
							disabled={!backendRunning}
							onClick={continueLocal}
							ref={localCtaRef}
							title={backendRunning ? undefined : "Starting local engine…"}
							type="button"
						>
							Continue with Local
							<span aria-hidden="true">→</span>
						</button>
						<p
							aria-live="polite"
							className={`mt-2 text-muted-foreground text-xs ${
								backendRunning ? "opacity-0" : "animate-sidecar-pulse"
							}`}
						>
							{backendRunning ? "Local engine ready" : "Starting local engine…"}
						</p>
					</div>
				</article>

				<article className="relative flex flex-col gap-2 rounded-lg border border-border bg-background p-5 text-left shadow-xs">
					<header className="flex items-center gap-2">
						<h3 className="m-0 font-medium text-base text-foreground">Cognee Cloud</h3>
					</header>
					<p className="m-0 min-h-[2.6rem] text-[13.5px] text-body leading-relaxed">
						Cognee Desktop with Cloud backing — same surface, datasets in your Cognee Cloud
						workspace.
					</p>
					<div className="mt-2.5">
						<button
							className="inline-flex items-center gap-2 px-1 py-2 font-medium text-primary text-sm transition-colors hover:text-primary-hover"
							onClick={cloudPlaceholder}
							type="button"
						>
							Sign in with Cognee Cloud
							<span aria-hidden="true">→</span>
						</button>
					</div>
				</article>
			</div>
		</section>
	);
}

export const Route = createFileRoute("/welcome/mode")({
	component: ModeSelection,
});
