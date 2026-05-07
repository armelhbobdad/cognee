import type { ReactNode } from "react";
import { CogneeMark } from "./cognee-mark";

interface EmptyStateProps {
	className?: string;
	cta?: ReactNode;
	description: string;
	/**
	 * Optional override glyph rendered above the title. When omitted (the v0.1
	 * default for cognee surfaces) the cognee mark renders at hero scale,
	 * faded, so the empty surface still carries brand. Pass a Hugeicons element
	 * here only when the empty state belongs to a specific subsystem (sidecar,
	 * network) that wants its own visual signal.
	 */
	icon?: ReactNode;
	title: string;
}

// Centered hero for "nothing to show" surfaces. Variants share the same
// anatomy (mark + title + description + optional CTA) and differ only in
// copy: no-datasets, search-no-results, sidecar-not-ready, network-
// disconnected. The default mark is the cognee glyph at hero scale, faded
// to ~12% — the brand quietly anchors every empty moment so first-time users
// know whose tool this is and what's expected here.
//
// Discipline: this is the user's most exposed zero-data surface. Title in
// TWK Lausanne (display) so it carries character even at small zoom; CTA
// styling is the consumer's choice but the calm-tone discipline reserves
// `bg-primary` for irreversible actions, so prefer outline/ghost variants
// here.
//
// max-w-[28rem] uses an arbitrary value because the project's @theme inline
// block maps --spacing-sm to a small padding token (~12px), which would
// otherwise clamp max-w-sm to 12px. See `src/mainview/index.css`.
export function EmptyState({ icon, title, description, cta, className = "" }: EmptyStateProps) {
	return (
		<div className={`flex flex-1 items-center justify-center p-8 ${className}`}>
			<div className="flex w-full max-w-[28rem] flex-col items-center text-center">
				{icon ? (
					<div className="mb-5 flex size-14 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
						{icon}
					</div>
				) : (
					<CogneeMark className="mb-6 text-foreground/[0.12]" size={88} />
				)}
				<h2 className="font-bold font-display text-2xl text-foreground tracking-tight">{title}</h2>
				<p className="mt-3 text-body text-sm leading-relaxed">{description}</p>
				{cta && <div className="mt-6 flex justify-center">{cta}</div>}
			</div>
		</div>
	);
}
