import { useCallback, useEffect, useState, useRef } from "preact/hooks";
import UploadMethod from "../../types/UploadMethod";
import { get_download_info } from "../../utils/comm/download/info";
import { DownloadEntireFile } from "../../utils/comm/download/entireDownload";
import { ChunkedDownload } from "../../utils/comm/download/chunkedDownload";
import type DownloadProgress from "../../types/DownloadProgress";
import type { DownloadFileInfo } from "../../types/DownloadFileInfo";
import { formatBytes } from "../../utils/math/bytes";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import ChipsSelect from "../../components/common/ChipsSelect";

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
	const [maxRetries, setMaxRetries] = useState(3);

	const [urlEditorValue, setUrlEditorValue] = useState("");
	const [urlEditorMethod, setUrlEditorMethod] = useState("chunked");
	const [urlEditorRetries, setUrlEditorRetries] = useState(maxRetries);

	const fileSizeRef = useRef<number | null>(null);

	import("../../assets/styles/public/common.css");
	import("../../assets/styles/public/download.css");

	const onProgress = useCallback((progress: DownloadProgress) => {
		if (fileSizeRef.current === null) return;
		setProgress((progress.loaded / fileSizeRef.current) * 100);
	}, []);

	// Effect to handle the URL editor
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("u", uuid);
		url.searchParams.set("method", urlEditorMethod.toString());
		url.searchParams.set("retry", urlEditorRetries.toString());
		setUrlEditorValue(url.toString());
	}, [uuid, urlEditorMethod, urlEditorRetries]);

	// Effect to initialize UUID from URL - runs once
	useEffect(() => {
		const url = new URL(window.location.href);
		const urlUuid = url.searchParams.get("u")
			|| url.searchParams.get("uuid")
			|| url.pathname.substring(3)
			|| "";
		setMaxRetries(Number.parseInt(url.searchParams.get("retry") || "3", 10));

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
					downloadPromise = DownloadEntireFile(fileInfo.uuid, onProgress);
				} else if (
					localDownloadMethod === UploadMethod.CHUNKED &&
					fileInfo.parts
				) {
					setVerbose(`Downloading chunked file: \n${uuid}`);
					downloadPromise = ChunkedDownload(
						fileInfo.uuid,
						fileInfo.parts,
						onProgress,
						abortController.signal,
						maxRetries,
					);
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

	const handleEditorTryAgain = () => {
		location.href = urlEditorValue;
	};

	return (
		<main>
			<h1>{status}</h1>
			{blobUrl === "" && (
				<p className={"bg-info"}>
					The file is being downloaded in the background, when it's done you'll
					be asked to select where to save it.
				</p>
			)}
			<p className="verbose">{verbose}</p>
			{error && <p className="error">{String(error)}<br/><a href="/">Go back home!</a></p>}
			{info && (
				<div className="file-info">
					<p>
						File: <em>{info.filename}</em>
					</p>
					<p>Size: {formatBytes(info.size)}</p>
				</div>
			)}
			<div className="download-progress" style={`--_progress: ${progress}%`}>
				<span>{Math.round(progress || 0)}%</span>
			</div>
			{blobUrl !== "" && (
				<p className="download-link">
					If the download doesn't start automatically, click here:{" "}
					<a href={blobUrl} download={info?.filename}>
						download file
					</a>
				</p>
			)}
			{status === "Error" && uuid && (
				<details>
					<summary>Try different download methods</summary>
					<div className="download-url-editor">
						<nav className="editor-output">
							<Input
								value={urlEditorValue}
								onChange={(e) => {
									e.preventDefault();
									if ((e.target as HTMLInputElement | null)?.value) {
										(e.target as HTMLInputElement).value = urlEditorValue;
									}
								}}
							/>
							<Button variant="primary" onClick={handleEditorTryAgain}><strong>Try it</strong></Button>
						</nav>
						<span htmlFor="method">Method:</span>{" "}
						<ChipsSelect
							options={[
								{ label: "Chunked", value: "chunked" },
								{ label: "Entire", value: "entire" },
							]}
							value={urlEditorMethod}
							onChange={(e) => {
								setUrlEditorMethod(e[0]);
							}}
						/>
						<span htmlFor="retries">Retries:</span>{" "}
						<ChipsSelect
							options={[
								{ label: "3 (default)", value: 3 },
								{ label: "10", value: 10 },
								{ label: "50", value: 50 },
							]}
							value={urlEditorRetries}
							onChange={(e) => {
								setUrlEditorRetries(e[0]);
							}}
						/>
					</div>
				</details>
			)}
		</main>
	);
}
