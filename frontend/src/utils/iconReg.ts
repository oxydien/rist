import UploadIcon from "../components/icons/UploadIcon";
import type { SVGProps } from "preact/compat";
import YoutubeIcon from "../components/icons/YoutubeIcon";
import MedalIcon from "../components/icons/MedalIcon";
import QuestionMarkIcon from "../components/icons/QuestionMarkIcon";
import CancelIcon from "../components/icons/CancelIcon";
import CheckIcon from "../components/icons/CheckIcon";
import CogsIcon from "../components/icons/CogsIcon";
import DatabaseShareIcon from "../components/icons/DatabaseShareIcon";
import ErrorIcon from "../components/icons/ErrorIcon";
import FileTimeIcon from "../components/icons/FileTimeIcon";
import ProgressHelpIcon from "../components/icons/ProgressHelpIcon";
import HashIcon from "../components/icons/HashIcon";
import CopyIcon from "../components/icons/CopyIcon";

export function getIcon(
	name: string,
): (props: SVGProps<SVGSVGElement>) => preact.JSX.Element {
	switch (name) {
		case "upload":
			return UploadIcon;
		case "youtube":
			return YoutubeIcon;
		case "medal":
			return MedalIcon;
		case "cancel":
			return CancelIcon;
		case "check":
			return CheckIcon;
		case "cogs":
			return CogsIcon;
		case "copy":
			return CopyIcon;
		case "database-share":
			return DatabaseShareIcon;
		case "error":
			return ErrorIcon;
		case "file-time":
			return FileTimeIcon;
		case "hash":
			return HashIcon;
		case "progress-help":
			return ProgressHelpIcon;
		default:
			return QuestionMarkIcon;
	}
}
