import { useState } from "preact/hooks";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { authorize } from "../../utils/comm/auth";

export default function AuthorizePage() {
	const [tokenVal, setTokenVal] = useState("");
	const [error, setError] = useState("");

	import("../../assets/styles/public/main.css");

	const handleFormSubmit = async (event?: MouseEvent) => {
		event?.preventDefault();
		if (tokenVal) {
			authorize(tokenVal)
				.then(() => {
					window.location.href = "/dash/";
				})
				.catch((error) => {
					console.error(error);
					setError(error);
				});
		}
	};

	const errorElement = error ? <p className="error">{String(error)}</p> : null;

	return (
		<main>
			<h1>Authorize</h1>
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
				/>
				<Button variant="primary" type="submit" onClick={handleFormSubmit}>
					Authorize
				</Button>
			</nav>
		</main>
	);
}
