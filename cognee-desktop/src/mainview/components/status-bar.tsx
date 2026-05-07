import { useAppStore } from "@/store/app-store";
import { Avatar } from "./avatar";

const APP_VERSION = "v0.1.0";

export function StatusBar() {
	const setupState = useAppStore((s) => s.setupState);
	const mode = useAppStore((s) => s.mode);
	const account = useAppStore((s) => s.account);

	const cloud = mode === "cloud";
	const postAuth = cloud && Boolean(account);

	const sidecarBusy = !(setupState?.backendRunning || setupState?.error);
	let sidecarLabel = "Sidecar starting…";
	if (setupState?.backendRunning) {
		sidecarLabel = "Sidecar ready";
	} else if (setupState?.error) {
		sidecarLabel = "Sidecar offline";
	}
	let sidecarColor = "bg-warning";
	if (setupState?.error) {
		sidecarColor = "bg-destructive";
	} else if (setupState?.backendRunning) {
		sidecarColor = "bg-success";
	}

	return (
		<footer
			className="flex items-center gap-3 border-border border-t bg-muted px-3 text-muted-foreground text-xs"
			style={{ height: "var(--statusbar-height)" }}
		>
			<span className="inline-flex items-center gap-1.5">
				{postAuth ? <Avatar name="" size={16} /> : null}
				<span className={`size-2 rounded-full ${cloud ? "bg-primary" : "bg-foreground"}`} />
				<span className="text-foreground">{cloud ? "Cloud" : "Local"}</span>
				<span aria-hidden="true">·</span>
				<span>{cloud ? account || "signed out" : "~/.cognee-desktop/"}</span>
			</span>

			<span aria-hidden="true" className="h-3 w-px bg-border" />

			<span className="inline-flex items-center gap-1.5">
				<span
					className={`size-2 rounded-full ${sidecarColor} ${sidecarBusy ? "animate-sidecar-pulse" : ""}`}
				/>
				<span>{sidecarLabel}</span>
			</span>

			<span className="flex-1" />

			<span>{APP_VERSION}</span>
		</footer>
	);
}
