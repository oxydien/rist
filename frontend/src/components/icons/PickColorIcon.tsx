import type {SVGProps} from "preact/compat";

export default function PickColorIcon(props: SVGProps<SVGSVGElement>) {
    return (
        // biome-ignore lint/a11y/noSvgWithoutTitle: ignore
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16" {...props}>
            <path
                d="M7.25464 4.24137L11.7586 8.74536M2 10.9973L10.7828 2.21458C10.9231 2.07704 11.1117 2 11.3082 2C11.5047 2 11.6934 2.07704 11.8337 2.21458L13.7854 4.16631C13.923 4.30663 14 4.49528 14 4.69177C14 4.88826 13.923 5.07692 13.7854 5.21724L5.00265 14H2V10.9973Z"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    )
}
