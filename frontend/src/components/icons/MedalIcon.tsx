import type { SVGProps } from "preact/compat";

export default function MedalIcon(props: SVGProps<SVGSVGElement>) {
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
				d="M12 4v3M8 4v6m8-6v6m-4 8.5L9 20l.5-3.5l-2-2l3-.5l1.5-3l1.5 3l3 .5l-2 2L15 20z"
			/>
		</svg>
	);
}
