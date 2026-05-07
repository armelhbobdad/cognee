import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CogneeMark } from "@/components/cognee-mark";
import { electrobun } from "@/lib/electrobun";

function WelcomeIndex() {
	const ctaRef = useRef<HTMLAnchorElement>(null);

	useEffect(() => {
		ctaRef.current?.focus();
	}, []);

	const openLearnMore = (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		electrobun.rpc?.request.openExternal({ url: "https://cognee.ai/" });
	};

	return (
		<section className="flex flex-1 flex-col items-center justify-center gap-12 px-8 py-16 text-center">
			<div className="flex items-center gap-4">
				<CogneeMark size={64} />
				<span
					className="font-bold font-display text-foreground leading-none tracking-tight"
					style={{ fontSize: 64 }}
				>
					cognee
				</span>
			</div>

			<div className="flex w-full max-w-[36rem] flex-col gap-4">
				<h1
					className="m-0 font-bold font-display text-foreground tracking-tight"
					style={{
						fontSize: 40,
						lineHeight: 1.2,
						letterSpacing: "-0.02em",
					}}
				>
					Make your knowledge visible.
				</h1>
				<p className="m-0 mx-auto max-w-[28rem] text-base text-body leading-relaxed">
					Cognee Desktop turns documents into a knowledge graph you can see, search, and trust.
				</p>
			</div>

			<div className="flex flex-col items-center gap-4">
				<Link
					className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-medium text-base text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
					ref={ctaRef}
					to="/welcome/mode"
				>
					Start exploring
					<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
				</Link>
				<a
					className="rounded-sm px-1.5 py-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
					href="https://cognee.ai/"
					onClick={openLearnMore}
				>
					Learn more on{" "}
					<span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>cognee.ai</span>
				</a>
			</div>
		</section>
	);
}

export const Route = createFileRoute("/welcome/")({
	component: WelcomeIndex,
});
