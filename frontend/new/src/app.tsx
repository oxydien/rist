import { LocationProvider, ErrorBoundary, Router, Route, lazy } from "preact-iso";
import AuthorizePage from "./pages/public/AuthorizePage";
import IndexPage from "./pages/public/IndexPage";

export function App() {
	const location = window.location;
	const currentPath = location.pathname;

	if (currentPath === "/") {
		return <IndexPage />;
	}
	if (currentPath.includes("authorize")) {
		return <AuthorizePage />;
	}
	if (currentPath.startsWith("/dash")) {
		const DashboardPage = lazy(() => import('./pages/private/DashboardPage'));

		return (
			<LocationProvider>
				<ErrorBoundary>
					<Router>
						<Route path="/dash" component={DashboardPage} />
						
					</Router>
				</ErrorBoundary>
			</LocationProvider>
		);
	}
	return <></>;
}
