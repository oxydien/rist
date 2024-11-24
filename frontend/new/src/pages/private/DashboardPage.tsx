import { useEffect, useState } from "preact/hooks";
import ModuleCard from "../../components/common/ModuleCard";
import Aside from "../../components/common/nav/Aside";
import { useAppStore } from "../../stores/appStore";
import { infoProcess } from "../../utils/comm/serverInfo";
import PageWrapper from "./PageWrapper";

export default function DashboardPage() {
	import("../../assets/styles/private/main.css");
	import("../../assets/styles/private/dashboard.css");
	const [loadingInfo, setLoadingInfo] = useState(false);
	const [loadedInfo, setLoadedInfo] = useState(false);

  useEffect(() => {
    if (!loadedInfo && !loadingInfo) {
      setLoadingInfo(true);
      infoProcess().then((info) => {
        console.log("Server info:", info);
        useAppStore.getState().updateServerInfo(info);
      });
      setLoadedInfo(true);
    }
  })
	const modules = useAppStore().modules;
	return (
		<PageWrapper>
			<Aside />

			<main>
				<h1>Dashboard</h1>
				<section className="modules">
					<h2>Modules</h2>
					<div className="grid">
						{loadingInfo && !modules.length ? (
							<p>Loading available modules...</p>
						) : modules.length === 0 ? (
							<p>No modules available.</p>
						) : (
							modules.map((module) => (
								<ModuleCard key={module.name} info={module} clickable />
							))
						)}
					</div>
				</section>
			</main>
		</PageWrapper>
	);
}
