import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";

interface PasswordInputProps {
	autoFocus?: boolean;
	className?: string;
	disabled?: boolean;
	errorText?: string;
	helpText?: string;
	label?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	value: string;
}

// Masked by default. Toggle reveals/hides plaintext.
// Revert-on-unmount privacy is the parent's responsibility: clear `value`
// in parent state on unmount so chrome cannot leak credentials between routes.
export function PasswordInput({
	value,
	onChange,
	label,
	placeholder,
	helpText,
	errorText,
	disabled,
	autoFocus,
	className = "",
}: PasswordInputProps) {
	const id = useId();
	const [revealed, setRevealed] = useState(false);
	const hasError = Boolean(errorText);

	const inputBorder = hasError
		? "border-destructive focus:ring-destructive/20"
		: "border-input focus:border-primary focus:ring-ring/10";

	return (
		<div className={`flex flex-col gap-1.5 ${className}`}>
			{label && (
				<label className="font-medium text-foreground text-sm" htmlFor={id}>
					{label}
				</label>
			)}
			<div className="relative">
				<input
					aria-invalid={hasError}
					autoComplete="off"
					autoFocus={autoFocus}
					className={`h-9 w-full rounded-md border bg-background px-3 pr-10 font-mono text-sm outline-none transition-colors placeholder:text-placeholder focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 ${inputBorder}`}
					disabled={disabled}
					id={id}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					spellCheck={false}
					type={revealed ? "text" : "password"}
					value={value}
				/>
				<button
					aria-label={revealed ? "Hide value" : "Show value"}
					aria-pressed={revealed}
					className="absolute top-0 right-0 flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
					disabled={disabled}
					onClick={() => setRevealed((r) => !r)}
					type="button"
				>
					<HugeiconsIcon
						icon={revealed ? ViewOffSlashIcon : ViewIcon}
						size={16}
						strokeWidth={1.5}
					/>
				</button>
			</div>
			{helpText && !hasError && <p className="text-muted-foreground text-xs">{helpText}</p>}
			{errorText && <p className="text-destructive text-xs">{errorText}</p>}
		</div>
	);
}
