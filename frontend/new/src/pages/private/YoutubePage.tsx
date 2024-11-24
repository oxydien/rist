import Button from "../../components/common/Button";
import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";
import {
	downloadYoutube,
	type DownloadOptions,
	type DownloadProgress,
} from "../../utils/comm/modules/youtube";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIcon } from "../../utils/iconReg";
import Input from "../../components/common/Input";
import ChipsSelect from "../../components/common/ChipsSelect";

interface YoutubeRequest extends DownloadOptions {
	state?: DownloadProgress;
	started: boolean;
}

export default function YoutubePage() {
	import("../../assets/styles/private/main.css");
	import("../../assets/styles/private/youtube.css");

	const [queue, setQueue] = useState<YoutubeRequest[]>([]);
	const [url, setUrl] = useState<string>("");
	const [format, setFormat] = useState<DownloadOptions["format"]>("AudioMp3");
	const [quality, setQuality] = useState<DownloadOptions["quality"]>("Best");

	const getExisting = (rq: YoutubeRequest) => {
		return queue.findIndex(
			(item) =>
				item.url === rq.url &&
				item.format === rq.format &&
				item.quality === rq.quality,
		);
	};

	const canRequest = (rq: YoutubeRequest) => {
		return (
			getExisting(rq) === -1 &&
			queue.every(
				(item) =>
					!item.started ||
					item.state?.status === "completed" ||
					item.state?.status === "error",
			)
		);
	};

	const addRequest = (rq: YoutubeRequest) => {
		if (getExisting(rq) !== -1) return;
		setQueue([...queue, rq]);
	};

	const getIconState = (rq: YoutubeRequest) => {
		if (!rq.started) return "file-time";
		if (rq.state?.status === "requesting") return "cogs";
		if (rq.state?.status === "uploading") return "upload";
		if (rq.state?.status === "downloading") return "database-share";
		if (rq.state?.status === "completed") return "check";
		if (rq.state?.status === "error") return "error";
		return "progress-help";
	};

	const getColorState = (rq: YoutubeRequest) => {
		if (!rq.started) return "yellow";
		if (rq.state?.status === "requesting") return "mauve";
		if (rq.state?.status === "uploading") return "lavender";
		if (rq.state?.status === "downloading") return "green";
		if (rq.state?.status === "completed") return "teal";
		if (rq.state?.status === "error") return "maroon";
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
			started: false,
		});
	};

	const onRequestProgress = (
		rq: YoutubeRequest,
		progress: DownloadProgress,
	) => {
		setQueue((prev) =>
			prev.map((item) => {
				if (
					item.url === rq.url &&
					item.format === rq.format &&
					item.quality === rq.quality
				) {
					return { ...item, state: progress };
				}
				return item;
			}),
		);
	};

	const triggerDownload = useCallback((rq: YoutubeRequest) => {
		if (!rq.state?.downloadUrl) return;

		const link = document.createElement("a");
		link.href = rq.state.downloadUrl;
		link.download = rq.state.filename || "file";
		link.click();
		link.remove();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: yes
	useEffect(() => {
		const interval = setInterval(
			() =>
				setQueue((prev) =>
					prev.map((rq) => {
						if (!rq.started && canRequest(rq)) {
							downloadYoutube(
								{
									url: rq.url,
									format: rq.format,
									quality: rq.quality,
								},
								(progress) => {
									onRequestProgress(rq, progress);
								},
							);
							return { ...rq, started: true };
						}
						return rq;
					}),
				),
			1000,
		);

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
					{queue?.map((request, index) => (
						<div
							className="queue-item"
							key={request.url + request.format + request.quality || index}
						>
							<div
								className="queue-item-icon"
								style={{
									"--_color": `hsl(var(--${getColorState(request)}-color))`,
									"--_progress": `${request.state?.progress || 100}%`,
								}}
							>
								{getIcon(getIconState(request))({})}
							</div>
							<div className="queue-item-info">
								<div className="queue-item-main-info">
									<div className="queue-item-status">
										{request.state?.status || "Queued"}
									</div>
									<div className="queue-item-url" title={request.url}>
										{request.url}
									</div>
								</div>
								<div className="queue-item-other-info">
									<span className="queue-item-format">{request.format}</span>
									<span className="queue-item-quality">{request.quality}</span>
									{request.state?.downloadUrl && (
										<Button
											variant="primary"
											onClick={() => {
												triggerDownload(request);
											}}
											onKeyUp={(e?: KeyboardEvent) => {
												if (e?.key === "Enter") {
													triggerDownload(request);
												}
											}}
										>
											Download
										</Button>
									)}
								</div>
							</div>
							{request.state && (
								<div className="queue-item-state">
									{request.state.progress !== undefined && (
										<span className="queue-item-progress">
											{Math.round(request.state.progress)}%
										</span>
									)}
									{request.state.message && (
										<span className="queue-item-message">
											{request.state.message}
										</span>
									)}
								</div>
							)}
						</div>
					))}
				</div>
			</main>
		</PageWrapper>
	);
}
