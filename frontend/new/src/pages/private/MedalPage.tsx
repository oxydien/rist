import Button from "../../components/common/Button";
import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";
import {
	downloadMedal,
	type MedalDownloadOptions,
	type DownloadProgress,
	type VideoQuality,
	QUALITY_OPTIONS,
	type MedalState,
	addToQueue,
} from "../../utils/comm/modules/medal";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIcon } from "../../utils/iconReg";
import Input from "../../components/common/Input";
import ChipsSelect from "../../components/common/ChipsSelect";
import { useAppStore } from "../../stores/appStore";

interface MedalRequest extends MedalDownloadOptions {
	state?: DownloadProgress;
}

export default function MedalPage() {
	import("../../assets/styles/private/main.css");
	import("../../assets/styles/private/medal.css");

	const [url, setUrl] = useState<string>("");
	const [quality, setQuality] = useState<VideoQuality>("4");

	// Local queue, react does not support Maps :/
	const [localQueue, setLocalQueue] = useState<{
		[key: string]: DownloadProgress;
	}>({});

	const getQueue = (): { [key: string]: DownloadProgress } => {
		return (
			((useAppStore.getState().getModuleData("medal") as MedalState) ?? null)
				?.ongoingDownloads ?? {}
		);
	};

	const getExisting = (rq: MedalRequest) => {
		return Object.values(getQueue()).findIndex(
			(item) => item.url === rq.url && item.quality === rq.quality,
		);
	};

	const canRequest = () => {
		const allConditionsMet = Object.values(getQueue()).every((item) => {
			const condition = !item.startedAt || item.status === "completed" || item.status === "error";
			console.debug("Checking item:", item, "Condition met:", condition);
			return condition;
		});

		console.debug("All conditions met:", allConditionsMet);
		return allConditionsMet;
	};

	const addRequest = (rq: MedalRequest) => {
		if (getExisting(rq) !== -1) return;
		addToQueue(rq.url + rq.quality + Date.now(), rq);
	};

	const getIconState = (dp: DownloadProgress) => {
		if (!dp.startedAt) return "file-time";
		if (dp.status === "requesting") return "cogs";
		if (dp.status === "downloading") return "database-share";
		if (dp.status === "completed") return "check";
		if (dp.status === "error") return "error";
		return "progress-help";
	};

	const getColorState = (dp: DownloadProgress) => {
		if (!dp.startedAt || dp.status === "queued") return "yellow";
		if (dp.status === "requesting") return "mauve";
		if (dp.status === "downloading") return "green";
		if (dp.status === "completed") return "teal";
		if (dp.status === "error") return "maroon";
		return "peach";
	};

	const tryAddRequest = (e?: Event) => {
		e?.preventDefault();

		if (!url) {
			alert("Please enter a valid URL");
			return;
		}
		const urlMatch = url.match(
			/^((?:https?:)?\/\/)?((?:www|m)\.)?(medal\.tv)(\/([a-zA-Z0-9_\-]+))(\S+)?$/i,
		);

		if (!urlMatch) {
			alert("Invalid URL");
			return;
		}

		addRequest({
			url,
			quality,
		});
	};

	const triggerDownload = useCallback((dp: DownloadProgress) => {
		if (!dp.downloadUrl) return;

		const link = document.createElement("a");
		link.href = dp.downloadUrl;
		link.download = dp.filename || "file";
		link.click();
		link.remove();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: yes
	useEffect(() => {
		const interval = setInterval(() => {
			// Update local queue
			const queue = getQueue();
			setLocalQueue(queue);

			// Check and start unstarted requests
			for (const key in queue) {
				const item = getQueue()[key];
				if (!item.startedAt && item.url && item.quality) {
					if (canRequest()) {
						downloadMedal(key, {
							url: item.url,
							quality: item.quality,
						});
					}
				}
			}
		}, 150);

		return () => clearInterval(interval);
	}, []);

	return (
		<PageWrapper>
			<Aside />

			<main>
				<h1>Medal downloader</h1>
				<form
					action=""
					onSubmit={(e) => {
						e.preventDefault();
					}}
					className="medal-form"
				>
					<div className="url-input-wrapper">
						<Input
							type="text"
							placeholder="Enter the link here..."
							value={url}
							onChange={(e) => setUrl((e.target as HTMLInputElement)?.value)}
						/>
					</div>
					<div className="request-options">
						<div className="request-option-wrapper">
							<strong>Quality</strong>
							<ChipsSelect<VideoQuality>
								options={[
									{
										label: "Original (recommended)",
										value: QUALITY_OPTIONS.original,
									},
									{ label: "Worst (144p)", value: QUALITY_OPTIONS["144p"] },
									{ label: "Low (360p)", value: QUALITY_OPTIONS["360p"] },
									{ label: "Normal (720p)", value: QUALITY_OPTIONS["720p"] },
									{ label: "High (1080p)", value: QUALITY_OPTIONS["1080p"] },
								]}
								value={quality}
								onChange={(selected) => setQuality(selected[0])}
							/>
						</div>
					</div>
					<div className="action-wrapper">
						<Button variant="primary" onClick={tryAddRequest}>
							Download
						</Button>
					</div>
				</form>
				<div className="queue">
					{Object.entries(localQueue).map(
						([key, state]: [string, DownloadProgress], index) => (
							<div className="queue-item" key={key || index}>
								<div
									className="queue-item-icon"
									style={{
										"--_color": `hsl(var(--${getColorState(state)}-color))`,
										"--_progress": `${state.progress || 100}%`,
									}}
								>
									{getIcon(getIconState(state))({})}
								</div>
								<div className="queue-item-info">
									<div className="queue-item-main-info">
										<div className="queue-item-status">
											{state.status || "Queued"}
										</div>
										<div className="queue-item-url" title={state.url}>
											{state.url}
										</div>
									</div>
									<div className="queue-item-other-info">
										<span className="queue-item-quality">
											{
												Object.entries(QUALITY_OPTIONS).find(
													([_, value]) => value === state.quality,
												)?.[0]
											}
										</span>
										{state.downloadUrl && (
											<Button
												variant="primary"
												onClick={() => {
													triggerDownload(state);
												}}
												onKeyUp={(e?: KeyboardEvent) => {
													if (e?.key === "Enter") {
														triggerDownload(state);
													}
												}}
											>
												Download
											</Button>
										)}
									</div>
								</div>
								{(state.progress || state.message) && (
									<div className="queue-item-state">
										{state.progress !== undefined && (
											<span className="queue-item-progress">
												{Math.round(state.progress)}%{" "}
											</span>
										)}
										{state.message && (
											<span className="queue-item-message">
												{state.message}
											</span>
										)}
									</div>
								)}
							</div>
						),
					)}
				</div>
			</main>
		</PageWrapper>
	);
}
