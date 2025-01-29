import type ModuleInfo from "../../types/ModuleInfo";
import { getIcon } from "../../utils/iconReg";

interface ModuleCardProps {
	info: ModuleInfo;
	clickable?: boolean;
}

export default function ModuleCard({ ...props }: ModuleCardProps) {
	import("../../assets/styles/common/modulecard.css");

	const iconC = getIcon(props.info.icon_name)({});
	return (
		<a
			className="module-card"
			href={props.clickable ? `/dash/${props.info.module_dash_url}` : undefined}
		>
			<div className="module-card-icon">{iconC}</div>
			<h4>{props.info.name}</h4>
			<p>{props.info.summary}</p>
		</a>
	);
}
