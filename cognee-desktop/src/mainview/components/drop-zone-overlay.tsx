import { CloudUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export type DropZoneVariant = "valid" | "invalid";

interface DropZoneOverlayProps {
	className?: string;
	variant?: DropZoneVariant;
	visible: boolean;
}

const COPY = {
	valid: {
		title: "Drop documents to ingest",
		description: "Files will be cognified into your knowledge graph.",
	},
	invalid: {
		title: "File type not supported",
		description: "Cognee accepts text, markdown, PDF, and HTML files.",
	},
};

// Full-canvas overlay that appears while the user is dragging files over the
// app window. The valid variant uses primary purple; invalid (unsupported
// MIME) uses destructive red so the user releases instead of dropping.
//
// Parent component is responsible for wiring drag events on the window root
// (dragenter sets visible=true, dragleave/drop sets visible=false). The
// overlay itself is presentational.
export function DropZoneOverlay({
	visible,
	variant = "valid",
	className = "",
}: DropZoneOverlayProps) {
	if (!visible) {
		return null;
	}

	const isInvalid = variant === "invalid";
	const ringColor = isInvalid ? "border-destructive" : "border-primary";
	const iconColor = isInvalid ? "text-destructive" : "text-primary";
	const titleColor = isInvalid ? "text-destructive" : "text-foreground";
	const copy = COPY[variant];

	return (
		<div
			aria-live="polite"
			className={`fixed inset-0 z-40 flex items-center justify-center bg-foreground/20 backdrop-blur-sm ${className}`}
			role="dialog"
		>
			<div
				className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-background px-12 py-10 ${ringColor}`}
			>
				<div
					className={`inline-flex size-14 items-center justify-center rounded-full ${iconColor}`}
				>
					<HugeiconsIcon icon={CloudUploadIcon} size={32} strokeWidth={1.5} />
				</div>
				<div className="text-center">
					<h2 className={`font-medium text-lg tracking-tight ${titleColor}`}>{copy.title}</h2>
					<p className="mt-1 text-muted-foreground text-sm leading-relaxed">{copy.description}</p>
				</div>
			</div>
		</div>
	);
}
