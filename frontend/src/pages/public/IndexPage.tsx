import React, { type Component, Suspense } from "preact/compat";
import Button from "../../components/common/Button";

export default function IndexPage() {
	import("../../assets/styles/public/index.css");
	const IndexDecorations = React.lazy(
		() => import("../../components/common/decor/IndexDecorations"),
	);

	const [focused, setFocused] = React.useState(false);
	const authorizeButton = React.useRef<Component>(null);

	React.useEffect(() => {
		const tryFocus = () => {
			if (authorizeButton.current && !focused && authorizeButton.current.base) {
				(authorizeButton.current.base as HTMLElement).focus();
				setFocused(true);
				return;
			}
			requestAnimationFrame(tryFocus);
		};
		tryFocus();
	}, [focused]);

	return (
		<main style="opacity: 0" className="index-page">
			<Suspense fallback={null}>
				<IndexDecorations />
			</Suspense>
			<h1>RIST server</h1>
			<p>
				A Rust-powered, private, open-source, self-hosted file-sharing solution
			</p>
			<nav>
				<Button variant="primary" link="https://github.com/oxydien/rist">
					View on Github
				</Button>
				<Button link="/authorize" ref={authorizeButton}>Authorize here</Button>
			</nav>
		</main>
	);
}
