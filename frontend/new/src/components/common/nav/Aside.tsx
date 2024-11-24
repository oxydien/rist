import DashboardIcon from "../../icons/DashboardIcon";
import AsideFooter from "./AsideFooter";
import { AsideHeader } from "./AsideHeader";
import { AsideItem } from "./AsideItem";
import { useAppStore } from "../../../stores/appStore";
import { getIcon } from "../../../utils/iconReg";
import Button from "../Button";
import MenuIcon from "../../icons/MenuIcon";
import CancelIcon from "../../icons/CancelIcon";

export default function Aside() {
	import("../../../assets/styles/common/nav/aside.css");
	const currentPath = window.location.pathname;

	const generalAssideItems = [
		{
			link: "/dash",
			icon: DashboardIcon,
			text: "Dashboard",
		},
	];

	const moduleAssideItems = useAppStore().modules.map((module) => ({
		link: `/dash/${module.module_dash_url}`,
		icon: getIcon(module.icon_name),
		text: module.name,
	}));

	const className = `aside ${useAppStore().asideOpen ? "aside-open" : ""}`;
	return (
		<div className={className}>
			<div className="mobile-toggle">
				<Button onClick={() => useAppStore.getState().toggleAside()}>
					{useAppStore().asideOpen ? <CancelIcon /> : <MenuIcon />}
				</Button>
			</div>
			<AsideHeader isOpen={useAppStore().asideOpen} />
			<div className="aside-content">
				<div className="aside-group">
					<h3 title="General">General</h3>
					<ul>
						{generalAssideItems.map((item, index) => (
							<li key={item.text || index} title={item.text}>
								<AsideItem
									{...item}
									icon={<item.icon />}
									className={
										currentPath === item.link ? "aside-item-active" : ""
									}
								/>
							</li>
						))}
					</ul>
				</div>
				{moduleAssideItems.length > 0 && (
					<div className="aside-group">
						<h3 title="Modules">Modules</h3>
						<ul>
							{moduleAssideItems.map((item, index) => (
								<li key={item.text || index} title={item.text}>
									<AsideItem
										{...item}
										icon={<item.icon />}
										className={
											currentPath === item.link ? "aside-item-active" : ""
										}
									/>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
			<AsideFooter
				isOpen={useAppStore().asideOpen}
				setIsOpen={useAppStore().toggleAside}
			/>
		</div>
	);
}
