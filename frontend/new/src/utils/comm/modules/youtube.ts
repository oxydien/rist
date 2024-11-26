import { getToken, useAppStore } from "../../../stores/appStore";
import UploadMethod from "../../../types/UploadMethod";
import { getModuleRoute } from "../../staticRoutes";
import { ChunkedDownload } from "../download/chunkedDownload";
import { DownloadEntireFile } from "../download/entireDownload";
import { get_download_info } from "../download/info";

const YOUTUBE_STATE_KEY = "yt";
export interface YoutubeState {
	ongoingDownloads: { [key: string]: DownloadProgress };
}

export interface DownloadOptions {
	url: string;
	format: "AudioMp3" | "Video" | "AudioWav";
	quality: "Worst" | "Best" | "Medium" | "High";
}

interface DownloadRequestResponse {
	uuid: string;
	found: boolean;
	error?: string;
}

export interface DownloadProgress {
	status: "queued" | "requesting" | "uploading" | "downloading" | "completed" | "error";
	message: string;
	error?: string;
	filename?: string;
	progress?: number;
	downloadUrl?: string;
	url?: string;
	uuid?: string;
	found?: boolean;
	format?: "AudioMp3" | "Video" | "AudioWav";
	quality?: "Worst" | "Best" | "Medium" | "High";
	startedAt?: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

// MARK: Helpers
export function setupYoutubeState() {
	if (!useAppStore.getState().moduleData.has(YOUTUBE_STATE_KEY)) {
		useAppStore.getState().updateModuleData(YOUTUBE_STATE_KEY, {
			ongoingDownloads: {},
		} as YoutubeState);
	}
}

/*
 * Adds a new request to the queue
 * DOES NOT START THE DOWNLOAD, THAT HAS TO BE DONE WITH downloadYoutube MANUALLY
 */
export function addToQueue(uniqueId: string, rq: DownloadOptions) {
	setupYoutubeState();
	useAppStore.getState().updateModuleData(YOUTUBE_STATE_KEY, {
		ongoingDownloads: {
			...((
				useAppStore.getState().getModuleData(YOUTUBE_STATE_KEY) as YoutubeState
			)?.ongoingDownloads ?? {}),
			[uniqueId]: {
				status: "queued",
				url: rq.url,
				quality: rq.quality,
				format: rq.format,
			},
		},
	} as YoutubeState);
}

function updateProgress(
	uniqueId: string,
	progress: DownloadProgress,
	onProgressCallback?: ProgressCallback,
) {
	const state = useAppStore.getState();
	state.updateModuleData(YOUTUBE_STATE_KEY, {
		ongoingDownloads: {
			...((state.moduleData.get(YOUTUBE_STATE_KEY) as YoutubeState)
				?.ongoingDownloads ?? {}),
			[uniqueId]: {
				...((state.moduleData.get(YOUTUBE_STATE_KEY) as YoutubeState)
					?.ongoingDownloads[uniqueId] ?? {}),
				...progress,
			},
		},
	} as YoutubeState);

	if (onProgressCallback) {
		onProgressCallback(progress);
	}
}

// MARK: - Request
export async function requestYoutubeDownload(
	options: DownloadOptions,
): Promise<DownloadRequestResponse> {
	const response = await fetch(
		`${getModuleRoute("YOUTUBE_REQUEST")}?url=${options.url}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${getToken()}`,
			},
			body: JSON.stringify({
				kind: options.format,
				quality: options.quality,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Request failed: ${await response.text()}`);
	}

	const data = await response.json();
	return data as DownloadRequestResponse;
}

// MARK: - Download to server
export async function downloadOnServer(uuid: string): Promise<void> {
	const response = await fetch(
		getModuleRoute("YOUTUBE_DOWNLOAD")?.replace("<uuid>", uuid) ?? "",
		{
			headers: {
				Authorization: `Bearer ${getToken()}`,
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Download failed: ${await response.text()}`);
	}
}

// MARK: All in one
export async function downloadYoutube(
	uniqueId: string,
	options: DownloadOptions,
	onProgress?: ProgressCallback,
): Promise<void> {
	setupYoutubeState();
	try {
		// Initial request
		updateProgress(
			uniqueId,
			{
				status: "requesting",
				message: "Requesting download...",
				url: options.url,
				quality: options.quality,
				format: options.format,
				startedAt: Date.now(),
			},
			onProgress,
		);

		const requestData = await requestYoutubeDownload(options);

		if (requestData.error) {
			throw new Error(requestData.error);
		}

		if (!requestData.found) {
			throw new Error("Video not found");
		}

		// Start download
		updateProgress(
			uniqueId,
			{
				status: "uploading",
				message: "Downloading file to server...",
			},
			onProgress,
		);

		await downloadOnServer(requestData.uuid);

		updateProgress(
			uniqueId,
			{
				status: "requesting",
				message: "Checking download info...",
			},
			onProgress,
		);

		const info = await get_download_info(requestData.uuid);

		let blob: Blob | null = null;
		if (info.recommended_method !== UploadMethod.ENTIRE) {
			blob = await ChunkedDownload(
				requestData.uuid,
				info.parts ?? 1,
				(progress) => {
					updateProgress(
						uniqueId,
						{
							status: "downloading",
							message: "Downloading file...",
							progress: (progress.loaded / info.size) * 100,
						},
						onProgress,
					);
				},
			);
		} else {
			blob = await DownloadEntireFile(requestData.uuid, (progress) => {
				updateProgress(
					uniqueId,
					{
						status: "downloading",
						message: "Downloading file...",
						progress: (progress.loaded / info.size) * 100,
					},
					onProgress,
				);
			});
		}

		const downloadUrl = URL.createObjectURL(blob);

		let fileExtension = "";
		switch (options.format) {
			case "AudioMp3":
				fileExtension = "mp3";
				break;
			case "Video":
				fileExtension = "mp4";
				break;
			case "AudioWav":
				fileExtension = "wav";
				break;
		}
		updateProgress(
			uniqueId,
			{
				status: "completed",
				message: "Download ready!",
				filename: `${info.filename}.${fileExtension}`,
				downloadUrl,
			},
			onProgress,
		);
	} catch (error) {
		updateProgress(
			uniqueId,
			{
				status: "error",
				message:
					error instanceof Error ? error.message : "Unknown error occurred",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			onProgress,
		);
	}
}
