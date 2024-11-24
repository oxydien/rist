import { getToken } from "../../../stores/appStore";
import UploadMethod from "../../../types/UploadMethod";
import { getModuleRoute } from "../../staticRoutes";
import { ChunkedDownload } from "../download/chunkedDownload";
import { DownloadEntireFile } from "../download/entireDownload";
import { get_download_info } from "../download/info";

export type VideoQuality = "0" | "1" | "2" | "3" | "4";

export interface MedalDownloadOptions {
	url: string;
	quality: VideoQuality;
}

export interface DownloadProgress {
	status: "requesting" | "downloading" | "completed" | "error";
	message: string;
	error?: string;
	filename?: string;
	downloadUrl?: string;
	progress?: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export async function downloadMedal(
	options: MedalDownloadOptions,
	onProgress: ProgressCallback,
): Promise<void> {
	try {
		onProgress({
			status: "downloading",
			message: "Downloading to server...",
		});

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

		onProgress({
			status: "requesting",
			message: "Checking download info...",
		});

		const info = await get_download_info(uuid);

		let blob: Blob | null = null;
		if (info.recommended_method !== UploadMethod.ENTIRE) {
			blob = await ChunkedDownload(uuid, info.parts ?? 1, (progress) => {
				onProgress({
					status: "downloading",
					message: "Downloading file...",
					progress: (progress.loaded / info.size) * 100,
				});
			});
		} else {
			blob = await DownloadEntireFile(uuid, (progress) => {
				onProgress({
					status: "downloading",
					message: "Downloading file...",
					progress: (progress.loaded / info.size) * 100,
				});
			});
		}

		const downloadUrl = URL.createObjectURL(blob);

		onProgress({
			status: "completed",
			message: "Download ready!",
			filename: `${name}.mp4`,
			downloadUrl,
		});
	} catch (error) {
		onProgress({
			status: "error",
			message:
				error instanceof Error ? error.message : "Unknown error occurred",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

export const QUALITY_OPTIONS = {
	"144p": "0" as VideoQuality,
	"360p": "1" as VideoQuality,
	"720p": "2" as VideoQuality,
	"1080p": "3" as VideoQuality,
	original: "4" as VideoQuality,
} as const;
