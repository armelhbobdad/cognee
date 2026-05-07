import { Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface SetupGateProps {
	className?: string;
	ctaLabel?: string;
	description?: string;
	onOpenSettings: () => void;
	title?: string;
	visible: boolean;
}

// Centered guard shown when the user attempts an action that requires a
// missing piece of configuration. Most common case: dropping documents to
// ingest before any LLM key is configured. The CTA deep-links into the
// relevant Settings section.
//
// Returns null when not visible. Parent decides when to render based on
// the relevant capability check (e.g. `!llmKey`).
export function SetupGate({
	visible,
	title = "An LLM key is required",
	description = "Cognee uses an LLM provider to extract entities and relationships during cognify. Add a key in Settings to continue.",
	ctaLabel = "Open Settings · Model",
	onOpenSettings,
	className = "",
}: SetupGateProps) {
	if (!visible) {
		return null;
	}

	return (
		<div
			aria-live="polite"
			className={`fixed inset-0 z-30 flex items-center justify-center bg-foreground/20 ${className}`}
			role="dialog"
		>
			<div className="flex w-[min(90vw,28rem)] flex-col items-center gap-4 rounded-xl border border-border bg-background px-8 py-8 shadow-lg">
				<div className="inline-flex size-14 items-center justify-center rounded-full bg-selected text-primary">
					<HugeiconsIcon icon={Settings02Icon} size={28} strokeWidth={1.5} />
				</div>
				<div className="text-center">
					<h2 className="font-bold font-display text-foreground text-xl tracking-tight">{title}</h2>
					<p className="mt-2 text-muted-foreground text-sm leading-relaxed">{description}</p>
				</div>
				<button
					className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary-hover"
					onClick={onOpenSettings}
					type="button"
				>
					{ctaLabel}
				</button>
			</div>
		</div>
	);
}
