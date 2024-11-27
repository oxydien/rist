import { getToken, useAppStore } from "../../../stores/appStore";
import UploadMethod from "../../../types/UploadMethod";
import { getModuleRoute } from "../../staticRoutes";
import { ChunkedDownload } from "../download/chunkedDownload";
import { DownloadEntireFile } from "../download/entireDownload";
import { get_download_info } from "../download/info";

export type VideoQuality = "0" | "1" | "2" | "3" | "4";
const MEDAL_STATE_KEY = "medal";

export interface MedalState {
	ongoingDownloads: { [key: string]: DownloadProgress };
}

export interface MedalDownloadOptions {
	url: string;
	quality: VideoQuality;
}

export interface DownloadProgress {
	status: "queued" | "requesting" | "downloading" | "completed" | "error";
	message: string;
	error?: string;
	filename?: string;
	downloadUrl?: string;
	progress?: number;
	startedAt?: number;
	url?: string;
	quality?: VideoQuality;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export function setupMedalState() {
	if (!useAppStore.getState().moduleData.has(MEDAL_STATE_KEY)) {
		useAppStore.getState().updateModuleData(MEDAL_STATE_KEY, {
			ongoingDownloads: {},
		} as MedalState);
	}
}

/*
* Adds a new request to the queue
* DOES NOT START THE DOWNLOAD, THAT HAS TO BE DONE WITH downloadMedal MANUALLY
*/
export function addToQueue(uniqueId: string, rq: MedalDownloadOptions) {
	setupMedalState();
	useAppStore.getState().updateModuleData(MEDAL_STATE_KEY, {
		ongoingDownloads: {
			...((useAppStore.getState().getModuleData(MEDAL_STATE_KEY) as MedalState)?.ongoingDownloads ?? {}),
			[uniqueId]: {
				status: "queued",
				url: rq.url,
				quality: rq.quality,
			},
		},
	} as MedalState);
}

function updateProgress(
	uniqueId: string,
	progress: DownloadProgress,
	onProgressCallback?: ProgressCallback,
) {
	const state = useAppStore.getState();
	state.updateModuleData(MEDAL_STATE_KEY, {
		ongoingDownloads: {
			...((state.moduleData.get(MEDAL_STATE_KEY) as MedalState)?.ongoingDownloads ?? {}),
			[uniqueId]: {
				...((state.moduleData.get(MEDAL_STATE_KEY) as MedalState)?.ongoingDownloads[uniqueId] ?? {}),
				...progress,
			},
		},
	} as MedalState);

	if (onProgressCallback) {
		onProgressCallback(progress);
	}
}

export async function downloadMedal(
	uniqueId: string,
	options: MedalDownloadOptions,
	onProgress?: ProgressCallback,
): Promise<void> {
	setupMedalState();

	try {
		updateProgress(
			uniqueId,
			{
				status: "downloading",
				message: "Downloading to server...",
				startedAt: Date.now(),
				url: options.url,
				quality: options.quality,
			},
			onProgress,
		);

		const response = await fetch(
			`${getModuleRoute("MEDAL_DOWNLOAD")}?url=${options.url}&quality=${options.quality}`,
			{
				headers: {
					Authorization: `Bearer ${getToken()}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Request failed: ${await response.text()}`);
		}

		const { uuid, name } = (await response.json()) as {
			uuid: string;
			name: string;
		};

		updateProgress(
			uniqueId,
			{
				status: "requesting",
				message: "Checking download info...",
			},
			onProgress,
		);

		const info = await get_download_info(uuid);

		let blob: Blob | null = null;
		if (info.recommended_method !== UploadMethod.ENTIRE) {
			blob = await ChunkedDownload(uuid, info.parts ?? 1, (progress) => {
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
		} else {
			blob = await DownloadEntireFile(uuid, (progress) => {
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

		updateProgress(
			uniqueId,
			{
				status: "completed",
				message: "Download ready!",
				filename: `${name}.mp4`,
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

export const QUALITY_OPTIONS = {
	"144p": "0" as VideoQuality,
	"360p": "1" as VideoQuality,
	"720p": "2" as VideoQuality,
	"1080p": "3" as VideoQuality,
	original: "4" as VideoQuality,
} as const;
