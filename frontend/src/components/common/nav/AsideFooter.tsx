import "../../../assets/styles/common/nav/asidefooter.css";
import { logout } from "../../../utils/comm/auth";
import CloseNavIcon from "../../icons/CloseNavIcon";
import LogOutIcon from "../../icons/LogOutIcon";
import OpenNavIcon from "../../icons/OpenNavIcon";
import Button from "../Button";
import { AsideItem } from "./AsideItem";

interface AsideFooterProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function AsideFooter({ ...props }: AsideFooterProps) {
  const handleLogOut = () => {
    logout();
  };
  const handleToggleNav = () => {
    props.setIsOpen(!props.isOpen);
  };

  return (
    <div className="aside-footer">
      <AsideItem text="Logout" onClick={handleLogOut} icon={<LogOutIcon />} />
      <Button className="aside-nav-toggle" onClick={handleToggleNav}>
        {props.isOpen ? <CloseNavIcon /> : <OpenNavIcon />}
      </Button>
    </div>
  );
}
