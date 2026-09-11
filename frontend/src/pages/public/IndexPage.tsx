import React, {type Component, lazy, Suspense} from "preact/compat";
import Button from "../../components/common/Button";
import {useEffect} from "preact/hooks";

export default function IndexPage() {
	import("../../assets/styles/public/common.css");
	import("../../assets/styles/public/landing.css");
	const IndexDecorations = React.lazy(
		() => import("../../components/common/decor/IndexDecorations"),
	);

	const [focused, setFocused] = React.useState(false);
	const authorizeButton = React.useRef<Component>(null);

	const infoParam = new URL(window.location.href).searchParams.get("info");
	const infoBox = infoParam ?
		<div className={"warn"}>{infoParam}</div>
	 : null

	useEffect(() => {
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

	const ChatIcon = lazy(() => import("../../components/icons/RistChatIcon"));

	return (
		<main className="index-page" style={{"opacity": 0}}>
			<Suspense fallback={null}>
				<IndexDecorations />
			</Suspense>
			{infoBox}

			<h1>RIST</h1>
			<p>
				welcome to the <em>interesting</em><br/>
				edge of internet
			</p>
			<nav>
				<Button variant="primary" link="https://github.com/oxydien/rist">
					Explore on Github
				</Button>
				<Button link="/authorize" ref={authorizeButton}>Authorize here</Button>
				<Button link="/chat">
					<Suspense fallback={null}>
						<ChatIcon/>
					</Suspense>
					Start chatting!
				</Button>
			</nav>
		</main>
	);
}
