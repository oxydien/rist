import Button from "../../components/common/Button";

export default function IndexPage() {
	import("../../assets/styles/public/main.css");

	return (
		<main>
			<h1>RIST server</h1>
			<p>
				A Rust-powered, private, open-source, self-hosted file-sharing solution
			</p>
			<nav>
				<Button variant="primary" link="https://github.com/oxydien/rist">
					View on Github
				</Button>
				<Button link="/authorize">Authorize here</Button>
			</nav>
		</main>
	);
}
