interface SettingsRadioOption {
	disabled?: boolean;
	help?: string;
	label: string;
	recommended?: boolean;
	value: string;
}

interface SettingsRadioProps {
	className?: string;
	disabled?: boolean;
	name: string;
	onChange: (value: string) => void;
	options: SettingsRadioOption[];
	value: string;
}

// Radio group with selected ring (--primary), recommended annotation,
// and per-option help text. Used in Settings · Mode-Account and Settings · Model
// for credential-storage choice (keychain vs config file).
//
// Help text and the "(recommended)" annotation use --secondary-text rather
// than --muted-foreground so they meet WCAG AA contrast on both the white
// (--background) row and the soft-purple (--selected) row. --muted-foreground
// (#71717a) on --selected (#f0edff) computes to 4.2:1 (below the 4.5:1 floor);
// --secondary-text (#52525b) clears it on both backgrounds.
export function SettingsRadio({
	name,
	options,
	value,
	onChange,
	disabled,
	className = "",
}: SettingsRadioProps) {
	return (
		<div className={`flex flex-col gap-2 ${className}`} role="radiogroup">
			{options.map((option) => {
				const selected = option.value === value;
				const optionDisabled = disabled || option.disabled;
				const rowState = selected
					? "border-primary bg-selected"
					: "border-border bg-background hover:bg-accent";
				const rowInteract = optionDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer";
				return (
					<label
						className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${rowState} ${rowInteract}`}
						key={option.value}
					>
						<input
							checked={selected}
							className="sr-only"
							disabled={optionDisabled}
							name={name}
							onChange={() => onChange(option.value)}
							type="radio"
							value={option.value}
						/>
						<span
							aria-hidden="true"
							className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
								selected ? "border-primary" : "border-input"
							}`}
						>
							{selected && <span className="size-2 rounded-full bg-primary" />}
						</span>
						<span className="flex flex-col gap-0.5">
							<span className="font-medium text-foreground text-sm">
								{option.label}
								{option.recommended && (
									<span className="ml-2 font-normal text-secondary-text text-xs">
										(recommended)
									</span>
								)}
							</span>
							{option.help && <span className="text-secondary-text text-xs">{option.help}</span>}
						</span>
					</label>
				);
			})}
		</div>
	);
}
