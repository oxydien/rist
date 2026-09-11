import { lazy, Suspense } from "preact/compat";
import { useState, useEffect } from "preact/hooks";
import { isAuthorized, useAppStore } from "./stores/appStore";
import { LocationProvider, ErrorBoundary, Router, Route } from "preact-iso";
import { infoProcess } from "./utils/comm/serverInfo";

// Public pages
const IndexPage       = lazy(() => import("./pages/public/IndexPage"));
const AuthorizePage   = lazy(() => import("./pages/public/AuthorizePage"));
const DownloadPage    = lazy(() => import("./pages/public/DownloadPage"));
const ChatLandingPage = lazy(() => import("./pages/public/chat/ChatLandingPage"));
const ChatPage        = lazy(() => import("./pages/public/chat/ChatPage"));

// Private pages
const DashboardPage   = lazy(() => import("./pages/private/DashboardPage"));
const UploadPage      = lazy(() => import("./pages/private/UploadPage"));
const YoutubePage     = lazy(() => import("./pages/private/YoutubePage"));
const MedalPage       = lazy(() => import("./pages/private/MedalPage"));

export function navigate(href: string): void {
	history.pushState(null, "", href);
	window.dispatchEvent(
		new CustomEvent("router:navigate", { detail: href.trim().toLowerCase() })
	);
}

type Segment = "index" | "authorize" | "download" | "chat" | "chat-landing" | "dash" | "404";

function getSegment(path: string): Segment {
	if (path === "/")                             return "index";
	if (path.startsWith("/authorize")) return "authorize";
	if (path.startsWith("/f"))         return "download";
	if (path.startsWith("/chat"))      return "chat-landing";
	if (path.startsWith("/c/"))        return "chat";
	if (path.startsWith("/dash"))      return "dash";
	return "404";
}

function DashSection() {
	const [loadingInfo, setLoadingInfo] = useState(false);
	const [defaultPath, setDefaultPath] = useState("");

	useEffect(() => {
		if (!isAuthorized()) {
			const path = window.location.pathname;
			const authPath = `/authorize?redirect=${encodeURIComponent(path)}&local=true` +
				`&msg=${encodeURIComponent("You are not authorized. Please authorize first.")}`
			navigate(authPath);
			setDefaultPath(authPath);
			return;
		}

		const state = useAppStore.getState();
		if (!state.serverInfo && !loadingInfo) {
			setLoadingInfo(true);
			infoProcess().then((info) => {
				useAppStore.getState().updateServerInfo(info);
				setLoadingInfo(false);
			});
		}
	}, []);

	if (!isAuthorized()) return DefaultSection(defaultPath);

	return (
		<LocationProvider>
			<ErrorBoundary>
				<Router>
					<Route path="/dash"         component={DashboardPage} />
					<Route path="/dash/upload"  component={UploadPage}    />
					<Route path="/dash/yt"      component={YoutubePage}   />
					<Route path="/dash/medal"   component={MedalPage}     />
					<Route default              component={DashboardPage} />
				</Router>
			</ErrorBoundary>
		</LocationProvider>
	);
}

function DefaultSection(path: string) {
	const segment = getSegment(path);
	console.info("Loading page:", segment);

	return (
		<Suspense fallback={null}>
			{segment === "index"        && <IndexPage />}
			{segment === "authorize"    && <AuthorizePage />}
			{segment === "download"     && <DownloadPage />}
			{segment === "chat-landing" && <ChatLandingPage />}
			{segment === "chat"         && <ChatPage />}
			{segment === "dash"         && <DashSection />}
			{segment === "404"          && <p>Not found.</p>} { /* Won't be visible anyway */ }
		</Suspense>
	);
}

export function App() {
	const [path, setPath] = useState(() =>
		window.location.pathname.trim().toLowerCase()
	);

	useEffect(() => {
		const onPop = () =>
			setPath(window.location.pathname.trim().toLowerCase());

		const onNav = (e: Event) =>
			setPath((e as CustomEvent<string>).detail);

		// Global <a> click interception for public routes only.
		const onLinkClick = (e: MouseEvent) => {
			const a = (e.target as Element).closest("a");
			if (!a) return;

			const href = a.getAttribute("href");
			if (
				!href ||
				a.target === "_blank" ||
				a.hasAttribute("data-reload") ||
				/^(https?:|\/\/|mailto:|tel:)/.test(href) ||
				href.startsWith("/dash")
			) return;

			e.preventDefault();
			navigate(href);
		};

		window.addEventListener("popstate", onPop);
		window.addEventListener("router:navigate", onNav);
		document.addEventListener("click", onLinkClick);

		return () => {
			window.removeEventListener("popstate", onPop);
			window.removeEventListener("router:navigate", onNav);
			document.removeEventListener("click", onLinkClick);
		};
	}, []);

	return DefaultSection(path);
}