import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

interface ConfirmModalProps {
	cancelLabel?: string;
	confirmLabel: string;
	description?: ReactNode;
	destructive?: boolean;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	title: string;
}

// Two-button modal for destructive or irreversible actions. Cancel is the
// auto-focused button (NOT a × close affordance) so the safe action is the
// keyboard-first choice and accidental Enter does not trigger destruction.
//
// The destructive variant turns the Confirm button red. Used for tombstoning
// datasets, removing API keys, signing out of cognee cloud.
export function ConfirmModal({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancel",
	destructive = false,
	onConfirm,
}: ConfirmModalProps) {
	const confirmClass = destructive
		? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
		: "bg-primary text-primary-foreground hover:bg-primary-hover";

	// `try/finally` guarantees the modal closes even if `onConfirm` throws.
	// Without this, a thrown handler leaves the modal visible with no feedback;
	// Cancel still works (`Dialog.Close` fires `onOpenChange(false)` directly),
	// but the user has no signal that Confirm did anything.
	const handleConfirm = () => {
		try {
			onConfirm();
		} finally {
			onOpenChange(false);
		}
	};

	return (
		<Dialog.Root onOpenChange={onOpenChange} open={open}>
			<Dialog.Portal>
				<Dialog.Overlay className="data-[state=closed]:fade-out data-[state=open]:fade-in fixed inset-0 z-40 bg-foreground/30 data-[state=closed]:animate-out data-[state=open]:animate-in" />
				<Dialog.Content className="data-[state=closed]:fade-out data-[state=open]:fade-in fixed top-1/2 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg outline-none data-[state=closed]:animate-out data-[state=open]:animate-in">
					<Dialog.Title className="font-bold font-display text-foreground text-xl tracking-tight">
						{title}
					</Dialog.Title>
					{description && (
						<Dialog.Description className="mt-2 text-muted-foreground text-sm leading-relaxed">
							{description}
						</Dialog.Description>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<Dialog.Close asChild>
							<button
								autoFocus
								className="rounded-md border border-border bg-background px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-accent"
								type="button"
							>
								{cancelLabel}
							</button>
						</Dialog.Close>
						<button
							className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${confirmClass}`}
							onClick={handleConfirm}
							type="button"
						>
							{confirmLabel}
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
