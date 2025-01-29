import {
	LocationProvider,
	ErrorBoundary,
	Router,
	Route,
	lazy,
} from "preact-iso";
import AuthorizePage from "./pages/public/AuthorizePage";
import IndexPage from "./pages/public/IndexPage";
import DownloadPage from "./pages/public/DownloadPage";
import { useEffect, useState } from "preact/hooks";
import { getToken, isAuthorized, useAppStore } from "./stores/appStore";
import { infoProcess } from "./utils/comm/serverInfo";
import { authorize } from "./utils/comm/auth";

export function App() {
	const location = window.location;
	const currentPath = location.pathname.trim().toLowerCase();
	const [retryCount, setRetryCount] = useState(0);
	const [triedAuth, setTriedAuth] = useState(false);

	useEffect(() => {
		if (triedAuth) {
			return;
		}
		setTriedAuth(true);
		const potentiallyToken = getToken();
		if (!isAuthorized() && potentiallyToken) {
			authorize(potentiallyToken)
				.then(() => {
					setRetryCount(retryCount + 1);
				})
				.catch((e) => {
					if (!(e instanceof Error)) {
						return;
					}
					console.error("Error while authorizing", e.message);
					if (currentPath.startsWith("/dash")) {
						window.location.href = `/authorize?redirect=${encodeURIComponent(currentPath)}&local=true&msg=${encodeURIComponent("Server couldn't authorize you. Please try again.")}`;
					}
					return;
				});
		} else if (currentPath.startsWith("/dash")) {
			window.location.href = `/authorize?redirect=${encodeURIComponent(currentPath)}&local=true&msg=${encodeURIComponent("You are not authorized to access this page. Please authorize first.")}`;
		}
	});

	if (currentPath === "/") {
		return <IndexPage />;
	}
	if (currentPath.includes("authorize")) {
		return <AuthorizePage />;
	}
	if (currentPath === "/f") {
		return <DownloadPage />;
	}

	if (currentPath.startsWith("/dash")) {
		const DashboardPage = lazy(() => import("./pages/private/DashboardPage"));
		const UploadPage = lazy(() => import("./pages/private/UploadPage"));
		const YoutubePage = lazy(() => import("./pages/private/YoutubePage"));
		const MedalPage = lazy(() => import("./pages/private/MedalPage"));

		const [loadingInfo, setLoadingInfo] = useState(false);

		// biome-ignore lint/correctness/useExhaustiveDependencies: intended (retryCount)
		useEffect(() => {
			if (
				!useAppStore.getState().serverInfo &&
				isAuthorized() &&
				!loadingInfo
			) {
				setLoadingInfo(true);
				infoProcess().then((info) => {
					console.log("Server info:", info);
					useAppStore.getState().updateServerInfo(info);
				});
				setLoadingInfo(false);
			}
		}, [retryCount, loadingInfo]);

		return (
			<LocationProvider>
				{/* TODO: Add some error handling here */}
				<ErrorBoundary>
					<Router>
						<Route path="/dash" component={DashboardPage} />
						<Route path="/dash/upload" component={UploadPage} />
						<Route path="/dash/yt" component={YoutubePage} />
						<Route path="/dash/medal" component={MedalPage} />
						<Route default component={DashboardPage} />
					</Router>
				</ErrorBoundary>
			</LocationProvider>
		);
	}
	return <></>;
}
