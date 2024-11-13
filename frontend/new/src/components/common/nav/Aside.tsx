import { useState } from "preact/hooks";
import DashboardIcon from "../../icons/DashboardIcon";
import AsideFooter from "./AsideFooter";
import { AsideHeader } from "./AsideHeader";
import { AsideItem } from "./AsideItem";
import { useAppStore } from "../../../stores/appStore";
import { getIcon } from "../../../utils/iconReg";

export default function Aside() {
  import("../../../assets/styles/common/nav/aside.css");
  const [isOpen, setIsOpen] = useState(true);
  const currentPath = window.location.pathname;

  const generalAssideItems = [
    {
      link: "/dash",
      icon: DashboardIcon,
      text: "Dashboard",
    },
  ];

  const moduleAssideItems = useAppStore().modules.map((module) => ({
    link: `/dash/${module.moduleDashUrl}`,
    icon: getIcon(module.iconName),
    text: module.name,
  }));

  const className = `aside ${isOpen ? "aside-open" : ""}`;
  return (
    <div className={className}>
      <AsideHeader isOpen={isOpen} />
      <div className="aside-content">
        <div className="aside-group">
          <h3 title="General">General</h3>
          <ul>
            {generalAssideItems.map((item, index) => (
              <li key={item.text || index} title={item.text}>
                <AsideItem
                  {...item}
                  icon={<item.icon />}
                  className={currentPath === item.link ? "aside-item-active" : ""}
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
                    className={currentPath === item.link ? "aside-item-active" : ""}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <AsideFooter isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
}
