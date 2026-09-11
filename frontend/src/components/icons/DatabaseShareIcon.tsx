import type { SVGProps } from "preact/compat";

export default function DatabaseShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: ignore
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
        <path d="M4 6c0 1.657 3.582 3 8 3s8-1.343 8-3s-3.582-3-8-3s-8 1.343-8 3" />
        <path d="M4 6v6c0 1.657 3.582 3 8 3q.541 0 1.065-.026M20 13V6" />
        <path d="M4 12v6c0 1.657 3.582 3 8 3m4 1l5-5m0 4.5V17h-4.5" />
      </g>
    </svg>
  );
}
