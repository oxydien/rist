import type { JSX } from "preact";
import "../../../assets/styles/common/nav/asideitem.css";

interface AsideItemProps {
	link?: string;
	icon: JSX.Element;
	text: string;
	onClick?: () => void;
}

export function AsideItem({ link, icon, text, onClick }: AsideItemProps) {
	return (
		<a className="aside-item" href={link} onClick={onClick}>
			<div className="aside-item-icon">{icon}</div>
			<p>{text}</p>
		</a>
	);
}
