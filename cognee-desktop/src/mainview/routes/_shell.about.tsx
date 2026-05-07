import { createFileRoute } from "@tanstack/react-router";

function AboutRoute() {
	return (
		<div className="mx-auto max-w-[48rem] p-8">
			<h1 className="mb-2 font-bold font-display text-2xl tracking-tight">About</h1>
			<p className="text-muted-foreground">
				Cognee Desktop · v0.1.0 · local-first knowledge-graph workspace.
			</p>
		</div>
	);
}

export const Route = createFileRoute("/_shell/about")({
	component: AboutRoute,
});
