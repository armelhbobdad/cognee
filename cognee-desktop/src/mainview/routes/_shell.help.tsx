import { createFileRoute } from "@tanstack/react-router";

function HelpRoute() {
	return (
		<div className="mx-auto max-w-[48rem] p-8">
			<h1 className="mb-2 font-bold font-display text-2xl tracking-tight">Help</h1>
			<p className="text-muted-foreground">
				Documentation lives at the Cognee Desktop repository for now.
			</p>
		</div>
	);
}

export const Route = createFileRoute("/_shell/help")({
	component: HelpRoute,
});
