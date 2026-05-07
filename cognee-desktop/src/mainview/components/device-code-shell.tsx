import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";

interface DeviceCodeShellProps {
	deviceCode: string;
	expiresInSeconds: number;
	onCancel?: () => void;
	onOpenBrowser: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

function formatCountdown(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Auth0 Device Authorization Flow shell. Shows the user-displayed device
// code (e.g. ABCD-1234) plus a primary "Open browser" button that launches
// the Auth0 verification URL. The countdown shows time until the code
// expires (default 15 minutes).
//
// Per §11.8 the modal-backdrop only dims; cognee chrome (sidebar, status
// bar) stays visible behind so the user sees they're still inside cognee
// during the auth flow.
export function DeviceCodeShell({
	open,
	onOpenChange,
	deviceCode,
	expiresInSeconds,
	onOpenBrowser,
	onCancel,
}: DeviceCodeShellProps) {
	const [remaining, setRemaining] = useState(expiresInSeconds);

	useEffect(() => {
		if (!open) {
			setRemaining(expiresInSeconds);
			return;
		}
		const start = Date.now();
		const interval = setInterval(() => {
			const elapsed = Math.floor((Date.now() - start) / 1000);
			const next = Math.max(0, expiresInSeconds - elapsed);
			setRemaining(next);
			if (next === 0) {
				clearInterval(interval);
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [open, expiresInSeconds]);

	const handleCancel = () => {
		onCancel?.();
		onOpenChange(false);
	};

	return (
		<Dialog.Root onOpenChange={onOpenChange} open={open}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20" />
				<Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg outline-none">
					<Dialog.Title className="font-bold font-display text-foreground text-xl tracking-tight">
						Sign in to Cognee Cloud
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-muted-foreground text-sm leading-relaxed">
						Enter this code on the verification page that opens in your browser.
					</Dialog.Description>

					<div className="mt-6 flex flex-col items-center gap-2 rounded-md border border-border bg-muted px-4 py-6">
						<span className="text-muted-foreground text-xs uppercase tracking-wider">
							Device code
						</span>
						<span className="font-mono font-semibold text-3xl text-foreground tabular-nums tracking-widest">
							{deviceCode}
						</span>
						<span className="font-mono text-muted-foreground text-xs tabular-nums">
							{formatCountdown(remaining)} · code expires in {Math.ceil(expiresInSeconds / 60)}{" "}
							minutes
						</span>
					</div>

					<div className="mt-6 flex justify-end gap-2">
						{onCancel && (
							<button
								className="rounded-md border border-border bg-background px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-accent"
								onClick={handleCancel}
								type="button"
							>
								Cancel
							</button>
						)}
						<button
							autoFocus
							className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary-hover"
							onClick={onOpenBrowser}
							type="button"
						>
							Open browser
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
