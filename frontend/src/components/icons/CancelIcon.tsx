import type { SVGProps } from "react";

export default function CancelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: ignore
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m15.364-6.364L5.636 18.364"
      />
    </svg>
  );
}
