import { useEffect, useRef, useState } from "preact/hooks";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { authorize } from "../../utils/comm/auth";
import type { Component } from "preact";

export default function AuthorizePage() {
	import("../../assets/styles/public/common.css");
	import("../../assets/styles/public/authorization.css");

	const [tokenVal, setTokenVal] = useState("");
	const [error, setError] = useState("");
	const [warn, setWarn] = useState("");
	const [isInProgress, setIsInProgress] = useState(false);
	const [redirect, setRedirect] = useState("/dash/");

	const [focused, setFocused] = useState(false);
	const inputRef = useRef<Component>(null);

	useEffect(() => {
		const url = new URL(window.location.href);
		const msg = url.searchParams.get("msg");
		if (msg) {
			setWarn(msg);
		}

		const redirectUrl = url.searchParams.get("redirect");
		if (redirectUrl) {
			setRedirect(redirectUrl);
		}

		const tryFocus = () => {
			if (inputRef.current && !focused && inputRef.current.base) {
				(inputRef.current.base as HTMLInputElement).focus();
				setFocused(true);
				return;
			}
			requestAnimationFrame(tryFocus);
		};
		tryFocus();
	}, [focused]);

	const handleFormSubmit = async (event?: MouseEvent) => {
		event?.preventDefault();
		if (!tokenVal) {
			try {
				setTokenVal(await window.navigator.clipboard.readText());
			} catch (_) {
				// Ignored: The website is not secured
				return;
			}
		}

		setIsInProgress(true);
		authorize(tokenVal)
			.then((res) => {
				console.debug(res);
				window.location.href = redirect;
			})
			.catch((error) => {
				console.error("Error while authorizing", error);
				setError(error);
			}).finally(() => {
				setIsInProgress(false);
			});
	};

	const errorElement = error ? <p className="error">{String(error)}</p> : null;
	const warnElement = warn ? <p className="warn">{String(warn)}</p> : null;

	return (
		<main className={"authorize-page"}>
			<h1>Authorize</h1>
			{warnElement}
			<p>
				To access the private section of this server, you need a token provided by
				the server owner. <br/>
				Paste the token below and click "<em>Authorize</em>."
			</p>
			{errorElement}
			<nav>
				<Input
					type="password"
					variant="primary"
					value={tokenVal}
					onChange={(e) => setTokenVal((e.target as HTMLInputElement).value)}
					placeholder="Access token"
					ref={inputRef}
					onKeyUp={(e) => {
						if (e?.key === "Enter") {
							handleFormSubmit();
						}
					}}
				/>
				<Button variant="primary" type="submit" onClick={handleFormSubmit} disabled={isInProgress}>
					{ (isInProgress ? "Loading..." : "Authorize") }
				</Button>
			</nav>
		</main>
	);
}
