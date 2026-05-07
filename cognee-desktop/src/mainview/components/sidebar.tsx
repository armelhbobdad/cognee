import {
	ArrowDown01Icon,
	Database01Icon,
	Settings02Icon,
	ShareKnowledgeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAppStore } from "@/store/app-store";
import { Avatar } from "./avatar";
import { CogneeMark } from "./cognee-mark";

type NavKey = "datasets" | "settings" | "about" | "help";

const NAV_ITEMS: Array<{
	key: NavKey;
	label: string;
	to: string;
	icon: typeof Database01Icon;
}> = [
	{ key: "datasets", label: "Datasets", to: "/", icon: Database01Icon },
	{ key: "settings", label: "Settings", to: "/settings", icon: Settings02Icon },
];

const FOOTER_ITEMS: Array<{ key: NavKey; label: string; to: string }> = [
	{ key: "about", label: "About", to: "/about" },
	{ key: "help", label: "Help", to: "/help" },
];

function activeKeyForPath(pathname: string): NavKey | null {
	if (pathname === "/" || pathname.startsWith("/datasets")) {
		return "datasets";
	}
	if (pathname.startsWith("/settings")) {
		return "settings";
	}
	if (pathname.startsWith("/about")) {
		return "about";
	}
	if (pathname.startsWith("/help")) {
		return "help";
	}
	return null;
}

export function Sidebar() {
	const mode = useAppStore((s) => s.mode);
	const account = useAppStore((s) => s.account);
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const active = activeKeyForPath(pathname);

	const cloud = mode === "cloud";
	const postAuth = cloud && Boolean(account);

	return (
		<aside
			className="flex flex-col gap-3 border-border border-r bg-muted px-3 py-4"
			style={{ width: "var(--sidebar-width)" }}
		>
			<div className="flex items-center gap-2 px-2 text-foreground">
				<CogneeMark size={20} />
				<span className="font-bold font-display text-lg tracking-tight">cognee</span>
			</div>

			<button
				className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
				type="button"
			>
				{postAuth ? <Avatar name="" size={20} /> : null}
				<span className={`size-2 rounded-full ${cloud ? "bg-primary" : "bg-foreground"}`} />
				<span className="flex-1 text-left">{cloud ? "Cloud" : "Local"}</span>
				<HugeiconsIcon
					className="text-muted-foreground"
					icon={ArrowDown01Icon}
					size={14}
					strokeWidth={1.5}
				/>
			</button>

			<nav className="flex flex-col gap-0.5">
				{NAV_ITEMS.map((item) => (
					<Link
						className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
							active === item.key
								? "bg-primary font-medium text-primary-foreground"
								: "text-foreground hover:bg-accent"
						}`}
						key={item.key}
						to={item.to}
					>
						<HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.5} />
						<span>{item.label}</span>
					</Link>
				))}
				<button
					className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-disabled"
					disabled
					type="button"
				>
					<HugeiconsIcon icon={ShareKnowledgeIcon} size={16} strokeWidth={1.5} />
					<span>Cells</span>
					<span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
						v0.2
					</span>
				</button>
			</nav>

			<div className="flex-1" />

			<div className="flex flex-col gap-0.5">
				{FOOTER_ITEMS.map((item) => (
					<Link
						className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
							active === item.key
								? "bg-primary font-medium text-primary-foreground"
								: "text-muted-foreground hover:bg-accent hover:text-foreground"
						}`}
						key={item.key}
						to={item.to}
					>
						{item.label}
					</Link>
				))}
			</div>
		</aside>
	);
}
