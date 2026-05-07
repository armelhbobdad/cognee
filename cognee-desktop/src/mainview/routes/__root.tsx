import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { electrobun, onSetupStateChanged } from "@/lib/electrobun";
import { useAppStore } from "@/store/app-store";

function RootLayout() {
	const setSetupState = useAppStore((s) => s.setSetupState);

	useEffect(() => {
		const unsubscribe = onSetupStateChanged(setSetupState);
		electrobun.rpc?.request.getSetupState({}).then(setSetupState);
		return unsubscribe;
	}, [setSetupState]);

	return (
		<div className="flex h-screen flex-col bg-surface-canvas text-foreground">
			<Outlet />
		</div>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
