import "../../../assets/styles/common/nav/asideheader.css";
import GithubIcon from "../../icons/GithubIcon";
import Button from "../Button";

export function AsideHeader() {
	return (
		<a className="aside-header" href="/dash">
			<div className="aside-header-icon">R</div>
			<h2>RIST server</h2>
			<Button
				variant="default"
				target="_blank"
				link="https://github.com/oxydien/rist"
			>
				<GithubIcon />
			</Button>
		</a>
	);
}
