import { useEffect, useState } from "preact/hooks";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { authorize } from "../../utils/comm/auth";

export default function AuthorizePage() {
	import("../../assets/styles/public/index.css");

	const [tokenVal, setTokenVal] = useState("");
	const [error, setError] = useState("");
	const [warn, setWarn] = useState("");
	const [redirect, setRedirect] = useState("/dash/");

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
	}, []);

	const handleFormSubmit = async (event?: MouseEvent) => {
		event?.preventDefault();
		if (tokenVal) {
			authorize(tokenVal)
				.then((res) => {
					console.debug(res);
					window.location.href = redirect;
				})
				.catch((error) => {
					console.error("Error while authorizing", error);
					setError(error);
				});
		}
	};

	const errorElement = error ? <p className="error">{String(error)}</p> : null;
	const warnElement = warn ? <p className="warn">{String(warn)}</p> : null;

	return (
		<main>
			<h1>Authorize</h1>
			{warnElement}
			<p>
				To use this private RIST server, you'll need an access token provided by
				the server owner. Paste the token below and click "Authorize."
			</p>
			{errorElement}
			<nav>
				<Input
					type="password"
					variant="primary"
					value={tokenVal}
					onChange={(e) => setTokenVal((e.target as HTMLInputElement).value)}
					placeholder="Access token"
					onKeyUp={(e) => {
						if (e?.key === "Enter") {
							handleFormSubmit();
						}
					}}
				/>
				<Button variant="primary" type="submit" onClick={handleFormSubmit}>
					Authorize
				</Button>
			</nav>
		</main>
	);
}
