interface AvatarProps {
	className?: string;
	name?: string;
	photo?: string;
	size?: number;
}

const WHITESPACE_PATTERN = /\s+/;

// Photo only renders at >= 64px; chrome-size renders show initials.
// Privacy: small chrome avatars (16/24px) never expose a recognisable face.
//
// Visual contrast: small avatars (<64) sit on muted/sidebar surfaces where
// `bg-accent` is near-zero contrast. A 1px border lifts the disc off the
// surface so the chrome reads as a coin, not floating text. The 64px
// settings variant keeps borderless because the photo (or large initials
// stack) already separates it from the surface.
export function Avatar({ size = 24, name = "", photo, className = "" }: AvatarProps) {
	const initials = name
		.split(WHITESPACE_PATTERN)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
	const showPhoto = photo && size >= 64;
	const isChromeSize = size < 64;
	return (
		<span
			aria-label={name || "avatar"}
			className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-accent font-medium text-foreground ${
				isChromeSize ? "border border-border" : ""
			} ${className}`}
			role="img"
			style={{
				width: size,
				height: size,
				fontSize: Math.max(9, Math.round(size * 0.42)),
			}}
		>
			{showPhoto ? (
				<img alt="" className="size-full object-cover" height={size} src={photo} width={size} />
			) : (
				<span aria-hidden="true">{initials}</span>
			)}
		</span>
	);
}
