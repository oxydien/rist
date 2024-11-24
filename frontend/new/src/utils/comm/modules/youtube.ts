import { getToken } from "../../../stores/appStore";
import UploadMethod from "../../../types/UploadMethod";
import { getModuleRoute } from "../../staticRoutes";
import { ChunkedDownload } from "../download/chunkedDownload";
import { DownloadEntireFile } from "../download/entireDownload";
import { get_download_info } from "../download/info";

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
	status: "requesting" | "uploading" | "downloading" | "completed" | "error";
	message: string;
	error?: string;
	filename?: string;
	progress?: number;
	downloadUrl?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

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
	options: DownloadOptions,
	onProgress: ProgressCallback,
): Promise<void> {
	try {
		// Initial request
		onProgress({
			status: "requesting",
			message: "Requesting download...",
		});

		const requestData = await requestYoutubeDownload(options);

		if (requestData.error) {
			throw new Error(requestData.error);
		}

		if (!requestData.found) {
			throw new Error("Video not found");
		}

		// Start download
		onProgress({
			status: "uploading",
			message: "Downloading file to server...",
		});

		await downloadOnServer(requestData.uuid);

		onProgress({
			status: "requesting",
			message: "Checking download info...",
		});

		const info = await get_download_info(requestData.uuid);

		let blob: Blob | null = null;
		if (info.recommended_method !== UploadMethod.ENTIRE) {
			blob = await ChunkedDownload(
				requestData.uuid,
				info.parts ?? 1,
				(progress) => {
					onProgress({
						status: "downloading",
						message: "Downloading file...",
						progress: (progress.loaded / info.size) * 100,
					});
				},
			);
		} else {
			blob = await DownloadEntireFile(requestData.uuid, (progress) => {
				onProgress({
					status: "downloading",
					message: "Downloading file...",
					progress: (progress.loaded / info.size) * 100,
				});
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
		onProgress({
			status: "completed",
			message: "Download ready!",
			filename: `${info.filename}.${fileExtension}`,
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
