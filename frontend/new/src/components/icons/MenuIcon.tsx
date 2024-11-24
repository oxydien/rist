import type { SVGProps } from "react";

export default function MenuIcon(props: SVGProps<SVGSVGElement>) {
	return (
		// biome-ignore lint/a11y/noSvgWithoutTitle: ignore
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<path
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	);
}
