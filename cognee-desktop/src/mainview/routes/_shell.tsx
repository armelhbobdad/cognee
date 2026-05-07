import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/sidebar";
import { StatusBar } from "@/components/status-bar";
import { electrobun } from "@/lib/electrobun";

function ShellLayout() {
	return (
		<>
			<div className="flex min-h-0 flex-1">
				<Sidebar />
				<main className="surface-canvas-atmosphere flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>
			<StatusBar />
		</>
	);
}

export const Route = createFileRoute("/_shell")({
	beforeLoad: async () => {
		const config = await electrobun.rpc?.request.getConfig({});
		if (config && !config.firstRunCompleted) {
			throw redirect({ to: "/welcome" });
		}
	},
	component: ShellLayout,
});
