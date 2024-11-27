import { useCallback, useEffect, useState, useRef } from "preact/hooks";
import UploadMethod from "../../types/UploadMethod";
import { get_download_info } from "../../utils/comm/download/info";
import { DownloadEntireFile } from "../../utils/comm/download/entireDownload";
import { ChunkedDownload } from "../../utils/comm/download/chunkedDownload";
import type DownloadProgress from "../../types/DownloadProgress";
import type { DownloadFileInfo } from "../../types/DownloadFileInfo";

export default function DownloadPage() {
	const [error, setError] = useState("");
	const [uuid, setUUID] = useState("");
	const [verbose, setVerbose] = useState("Checking UUID in URL...");
	const [status, setStatus] = useState("Fetching");
	const [info, setInfo] = useState<DownloadFileInfo | null>(null);
	const [progress, setProgress] = useState(0);
	const [downloadMethod, setDownloadMethod] = useState(UploadMethod.CHUNKED);
	const [hasAttemptedDownload, setHasAttemptedDownload] = useState(false);
	const [blobUrl, setBlobUrl] = useState("");
	const fileSizeRef = useRef<number | null>(null);

	import("../../assets/styles/public/index.css");

	const onProgress = useCallback((progress: DownloadProgress) => {
		if (fileSizeRef.current === null) return;
		setProgress((progress.loaded / fileSizeRef.current) * 100);
	}, []);

	// Effect to initialize UUID from URL - runs once
	useEffect(() => {
		const url = new URL(window.location.href);
		const urlUuid =
			url.searchParams.get("u") || url.searchParams.get("uuid") || "";

		if (!urlUuid) {
			setStatus("Error");
			setError(
				"It looks like the UUID wasn't specified in the URL. This is necessary to download the file. Make sure to keep the ?u=... in the URL.",
			);
			return;
		}

		setUUID(urlUuid);
		setVerbose(`Found UUID: ${urlUuid}`);

		const method = url.searchParams.get("method");
		if (method) {
			setDownloadMethod(
				method === "entire" ? UploadMethod.ENTIRE : UploadMethod.CHUNKED,
			);
		}
	}, []);

	// Effect to handle file download
	// biome-ignore lint/correctness/useExhaustiveDependencies: intended
	useEffect(() => {
		if (!uuid || hasAttemptedDownload) return;

		let isCurrentDownload = true;
		const abortController = new AbortController();

		const downloadFile = async () => {
			setHasAttemptedDownload(true);
			setVerbose(`Checking file info for: \n${uuid}`);

			try {
				const fileInfo = await get_download_info(uuid);

				if (!isCurrentDownload) return;

				setVerbose(`Found file info: \n${JSON.stringify(fileInfo)}`);
				setStatus("Downloading");
				setInfo(fileInfo);
				fileSizeRef.current = fileInfo.size;

				const localDownloadMethod =
					fileInfo.recommended_method !== UploadMethod.UNKNOWN
						? fileInfo.recommended_method
						: downloadMethod;
				setDownloadMethod(localDownloadMethod);

				let downloadPromise: Promise<Blob>;

				if (localDownloadMethod === UploadMethod.ENTIRE) {
					setVerbose(`Downloading entire file: \n${uuid}`);
					downloadPromise = DownloadEntireFile(uuid, onProgress);
				} else if (
					localDownloadMethod === UploadMethod.CHUNKED &&
					fileInfo.parts
				) {
					setVerbose(`Downloading chunked file: \n${uuid}`);
					downloadPromise = ChunkedDownload(uuid, fileInfo.parts, onProgress);
				} else {
					throw new Error(
						`Unsupported download method or no parts found; cannot download file. {method: ${localDownloadMethod}, parts: ${fileInfo.parts}}`,
					);
				}

				const blob = await downloadPromise;

				if (!isCurrentDownload) return;

				setProgress(100);
				setStatus("Done");
				setVerbose("Asking browser to download file");

				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = fileInfo.filename;
				link.click();

				setBlobUrl(url);
			} catch (error) {
				if (!isCurrentDownload) return;
				console.error("Download error:", error);
				setError(String(error));
				setStatus("Error");
				throw error;
			}
		};

		downloadFile().catch((error) => {
			// Handle any uncaught errors here if needed
			console.error("Unhandled download error:", error);
		});

		return () => {
			isCurrentDownload = false;
			abortController.abort();
			setVerbose("Aborting download");
			fileSizeRef.current = null;
		};
	}, [uuid, onProgress]);

	return (
		<main>
			<h1>{status}</h1>
			{blobUrl === "" && (
				<p>
					The file is being downloaded in the background, when it's done you'll
					be asked to select where to save it.
				</p>
			)}
			<p className="verbose">{verbose}</p>
			{error && <p className="error">{String(error)}</p>}
			<div className="download-progress" style={`--_progress: ${progress}%`}>
				<span>{Math.round(progress)}%</span>
			</div>
			{blobUrl !== "" && (
				<p className="download-link">
					If the download doesn't start automatically, click here:{" "}
					<a href={blobUrl} download={info?.filename}>
						download file
					</a>
				</p>
			)}
		</main>
	);
}
