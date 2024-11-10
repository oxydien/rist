import LogOutIcon from "../../icons/LogOutIcon";
import { AsideItem } from "./AsideItem";

export default function AsideFooter() {
	const handleLogOut = () => {};

	return (
		<div className="aside-footer">
			<AsideItem text="Logout" onClick={handleLogOut} icon={<LogOutIcon />} />
		</div>
	);
}
