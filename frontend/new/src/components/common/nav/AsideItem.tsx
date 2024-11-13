import type { JSX } from "preact";
import "../../../assets/styles/common/nav/asideitem.css";

interface AsideItemProps {
  link?: string;
  icon: JSX.Element;
  text: string;
  onClick?: () => void;
  className?: string;
}

export function AsideItem({ link, icon, text, onClick, ...props }: AsideItemProps) {
  const styles = `aside-item ${props.className ?? ""}`;
  return (
    <a className={styles} href={link} onClick={onClick}>
      <div className="aside-item-icon">{icon}</div>
      <p>{text}</p>
    </a>	
  );
}
