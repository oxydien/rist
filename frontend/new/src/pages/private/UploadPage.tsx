import { UploadWidget } from "../../components/modules/UploadWidget";
import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";

export default function DashboardPage() {
	import("../../assets/styles/private/main.css");
	import("../../assets/styles/private/upload.css");

	return (
		<PageWrapper>
			<Aside />

			<main>
				<h1>Upload</h1>
				<UploadWidget />
			</main>
		</PageWrapper>
	);
}
