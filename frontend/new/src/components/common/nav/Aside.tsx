import DashboardIcon from "../../icons/DashboardIcon";
import MedalIcon from "../../icons/MedalIcon";
import UploadIcon from "../../icons/UploadIcon";
import YoutubeIcon from "../../icons/YoutubeIcon";
import AsideFooter from "./AsideFooter";
import { AsideHeader } from "./AsideHeader";
import { AsideItem } from "./AsideItem";

export default function Aside() {
	import("../../../assets/styles/common/nav/aside.css");

	const generalAssideItems = [
		{
			link: "/dash",
			icon: <DashboardIcon />,
			text: "Dashboard",
		},
	];

	const moduleAssideItems = [
		{
			link: "/dash/upload",
			icon: <UploadIcon />,
			text: "Upload",
		},
		{
			link: "/dash/youtube",
			icon: <YoutubeIcon />,
			text: "Yt-dlp Download",
		},
		{
			link: "/dash/medal",
			icon: <MedalIcon />,
			text: "Medal download",
		},
	];

	return (
		<div className="aside">
			<AsideHeader />
			<div className="aside-content">
				<div className="aside-group">
					<h3>General</h3>
					<ul>
						{generalAssideItems.map((item, index) => (
							<li key={item.text || index}>
								<AsideItem {...item} />
							</li>
						))}
					</ul>
				</div>
				{moduleAssideItems.length > 0 && (
					<div className="aside-group">
						<h3>Modules</h3>
						<ul>
							{moduleAssideItems.map((item, index) => (
								<li key={item.text || index}>
									<AsideItem {...item} />
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
			<AsideFooter />
		</div>
	);
}
