import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";

export default function DashboardPage() {
	import("../../assets/styles/private/main.css");

	return (
		<PageWrapper>
			<Aside />

			<main>
				<h1>Dashboard</h1>
			</main>
		</PageWrapper>
	);
}
