import { createFileRoute } from "@tanstack/react-router";

function DatasetsRoute() {
	return (
		<div className="mx-auto max-w-[48rem] p-8">
			<h1 className="mb-2 font-bold font-display text-2xl tracking-tight">Datasets</h1>
			<p className="text-muted-foreground">Your local datasets will appear here.</p>
		</div>
	);
}

export const Route = createFileRoute("/_shell/")({
	component: DatasetsRoute,
});
