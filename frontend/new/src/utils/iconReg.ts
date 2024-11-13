import UploadIcon from "../components/icons/UploadIcon";
import type { SVGProps } from "preact/compat";
import YoutubeIcon from "../components/icons/YoutubeIcon";
import MedalIcon from "../components/icons/MedalIcon";
import QuestionMarkIcon from "../components/icons/QuestionMarkIcon";

export function getIcon(name: string): (props: SVGProps<SVGSVGElement>) => preact.JSX.Element {
  switch (name) {
    case 'upload':
      return UploadIcon;
    case 'youtube':
      return YoutubeIcon;
    case 'medal':
      return MedalIcon;
    default:
      return QuestionMarkIcon;
  }
}
