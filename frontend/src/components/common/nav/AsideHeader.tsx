import "../../../assets/styles/common/nav/asideheader.css";
import GithubIcon from "../../icons/GithubIcon";
import Button from "../Button";

interface AsideHeaderProps {
  isOpen: boolean;
}

export function AsideHeader({ ...props }: AsideHeaderProps) {
  return (
    <div className="aside-header">
      <a href="/dash" class="aside-header-dash">
        <div className="aside-header-icon">R</div>
        <h2>RIST server</h2>
      </a>
      <Button
        variant="default"
        disabled={!props.isOpen}
        tabIndex={props.isOpen ? 0 : -1}
        target="_blank"
        link="https://github.com/oxydien/rist"
      >
        <GithubIcon />
      </Button>
    </div>
  );
}
