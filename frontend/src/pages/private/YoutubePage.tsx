import Button from "../../components/common/Button";
import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";
import {
	addToQueue,
	downloadYoutube,
	type YoutubeState,
	type DownloadOptions,
	type DownloadProgress,
} from "../../utils/comm/modules/youtube";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIcon } from "../../utils/iconReg";
import Input from "../../components/common/Input";
import ChipsSelect from "../../components/common/ChipsSelect";
import { useAppStore } from "../../stores/appStore";

interface YoutubeRequest extends DownloadOptions {
	state?: DownloadProgress;
}

export default function YoutubePage() {
	import("../../assets/styles/private/private-common.css");
	import("../../assets/styles/private/youtube.css");

	const [localQueue, setLocalQueue] = useState<{
		[key: string]: DownloadProgress;
	}>({});
	const [url, setUrl] = useState<string>("");
	const [format, setFormat] = useState<DownloadOptions["format"]>("AudioMp3");
	const [quality, setQuality] = useState<DownloadOptions["quality"]>("Best");

	const getQueue = (): { [key: string]: DownloadProgress } => {
		return (
			((useAppStore.getState().getModuleData("yt") as YoutubeState) ?? null)
				?.ongoingDownloads ?? {}
		);
	};

	const getExisting = (rq: YoutubeRequest) => {
		return Object.values(getQueue()).findIndex(
			(item) =>
				item.url === rq.url &&
				item.format === rq.format &&
				item.quality === rq.quality,
		);
	};

	const canRequest = () => {
		const allConditionsMet = Object.values(getQueue()).every((item) => {
			const condition =
				!item.startedAt ||
				item.status === "completed" ||
				item.status === "error";
			return condition;
		});

		return allConditionsMet;
	};

	const addRequest = (rq: YoutubeRequest) => {
		if (getExisting(rq) !== -1) return;
		addToQueue(rq.url + rq.quality + Date.now(), rq);
	};

	const getIconState = (dp: DownloadProgress) => {
		if (!dp.startedAt) return "file-time";
		if (dp.status === "requesting") return "cogs";
		if (dp.status === "uploading") return "upload";
		if (dp.status === "downloading") return "database-share";
		if (dp.status === "completed") return "check";
		if (dp.status === "error") return "error";
		return "progress-help";
	};

	const getColorState = (dp: DownloadProgress) => {
		if (!dp.startedAt || dp.status === "queued") return "yellow";
		if (dp.status === "requesting") return "mauve";
		if (dp.status === "uploading") return "lavender";
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
			/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/i,
		);

		if (!urlMatch) {
			alert("Invalid URL");
			return;
		}

		addRequest({
			url,
			format,
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
				if (!item.startedAt && item.url && item.quality && item.format) {
					if (canRequest()) {
						downloadYoutube(key, {
							url: item.url,
							quality: item.quality,
							format: item.format,
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
				<h1>Youtube downloader</h1>
				<form
					action=""
					onSubmit={(e) => {
						e.preventDefault();
					}}
					className="yt-form"
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
							<strong>Format</strong>
							<ChipsSelect<DownloadOptions["format"]>
								options={[
									{ label: "Video", value: "Video" },
									{ label: "Mp3", value: "AudioMp3" },
									{ label: "Wav", value: "AudioWav" },
								]}
								value={format}
								onChange={(selected) => setFormat(selected[0])}
							/>
						</div>
						<div className="request-option-wrapper">
							<strong>Quality</strong>
							<ChipsSelect<DownloadOptions["quality"]>
								options={[
									{ label: "Worst", value: "Worst" },
									{ label: "Medium (720p)", value: "Medium" },
									{ label: "High (1080p)", value: "High" },
									{ label: "Best", value: "Best" },
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
											{state.status || "queued"}
										</div>
										<div className="queue-item-url" title={state.url}>
											{state.url}
										</div>
									</div>
									<div className="queue-item-other-info">
										<span className="queue-item-format">{state.format}</span>
										<span className="queue-item-quality">{state.quality}</span>
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
								{(state.error || state.message || state.progress) && (
									<div className="queue-item-state">
										{state.progress !== undefined && (
											<span className="queue-item-progress">
												{Math.round(state.progress)}%
											</span>
										)}
										{state.error ? (
											<span className="queue-item-error">{state.error}</span>
										) : (
											state.message && (
												<span className="queue-item-message">
													{state.message}
												</span>
											)
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
