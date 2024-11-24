import { LocationProvider, ErrorBoundary, Router, Route, lazy } from "preact-iso";
import AuthorizePage from "./pages/public/AuthorizePage";
import IndexPage from "./pages/public/IndexPage";
import DownloadPage from "./pages/public/DownloadPage";

export function App() {
  const location = window.location;
  const currentPath = location.pathname.trim().toLowerCase();

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

    return (
      <LocationProvider>
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
