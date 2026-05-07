import { createFileRoute } from "@tanstack/react-router";

function SettingsRoute() {
	return (
		<div className="mx-auto max-w-[48rem] p-8">
			<h1 className="mb-2 font-bold font-display text-2xl tracking-tight">Settings</h1>
			<p className="text-muted-foreground">Configuration panels are coming.</p>
		</div>
	);
}

export const Route = createFileRoute("/_shell/settings")({
	component: SettingsRoute,
});
