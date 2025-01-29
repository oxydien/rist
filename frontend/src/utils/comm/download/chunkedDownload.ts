import type DownloadProgress from "../../../types/DownloadProgress";
import { getRoute } from "../../staticRoutes";
import { relaxedRateLimitGuard } from "../_default";
import RequestQueue from "../requestQueue";

// Local
interface Part {
	uuid: string;
	part_number: number;
	blob: Blob;
}

interface DownloadError extends Error {
	partNumber?: number;
	status?: number; // HTTP status
	httpStatusText?: string;
}

/**
 * Downloads a specific part of a file using its UUID and part number.
 *
 * @param uuid - The UUID of the file to download.
 * @param part_number - The part number to download.
 * @param onProgress - An optional callback function to track the download progress.
 * @param signal - Optional AbortSignal for cancellation
 * @returns A promise that resolves to an object containing the UUID, part number, and the downloaded Blob.
 * @throws {DownloadError} Containing details about the failure including part number and HTTP status
 */
export async function DownloadPart(
	uuid: string,
	part_number: number,
	onProgress?: (progress: DownloadProgress) => void,
	signal?: AbortSignal,
): Promise<Part> {
	const url = getRoute("DOWNLOAD_PART")
		?.replace("<uuid>", uuid)
		?.replace("<part_number>", part_number.toString());

	if (!url) {
		const error = new Error(
			"Failed to construct download URL",
		) as DownloadError;
		error.partNumber = part_number;
		throw error;
	}

	try {
		const res = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/octet-stream",
			},
			signal,
		});

		if (!res.ok) {
			const errorText = await res.text();
			const error = new Error(
				`HTTP error! status: ${res.status}, ${res.statusText}, ${errorText}`,
			) as DownloadError;
			error.partNumber = part_number;
			error.status = res.status;
			error.httpStatusText = res.statusText;
			throw error;
		}

		if (res.body === null) {
			const error = new Error("Response body is null") as DownloadError;
			error.partNumber = part_number;
			throw error;
		}

		if (!onProgress) {
			const blob = await res.blob();
			return { uuid, part_number, blob };
		}

		const reader = res.body.getReader();
		const chunks: Uint8Array[] = [];
		let loadedBytes = 0;

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
				loadedBytes += value.length;
				onProgress({ loaded: loadedBytes, part: part_number });
			}

			const blob = new Blob(chunks);
			return { uuid, part_number, blob };
		} catch (error) {
			const downloadError = new Error(
				`Error reading stream for part ${part_number}: ${error}`,
			) as DownloadError;
			downloadError.partNumber = part_number;
			throw downloadError;
		} finally {
			reader.cancel().catch(console.error);
		}
	} catch (error) {
		if (error instanceof Error) {
			const downloadError = error as DownloadError;
			downloadError.partNumber = part_number;
			throw downloadError;
		}
		const downloadError = new Error(`Unknown error: ${error}`) as DownloadError;
		downloadError.partNumber = part_number;
		throw downloadError;
	}
}

/**
 * Downloads a file in chunks.
 *
 * @param uuid The uuid of the file
 * @param number_of_parts The number of parts the file is split into
 * @param onProgress An optional callback function to track the download progress
 * @param signal Optional AbortSignal for cancellation
 *
 * @returns A blob containing the entire file
 *
 * @throws {DownloadError} If any part fails to download, with details about which part failed
 */
export async function ChunkedDownload(
	uuid: string,
	number_of_parts: number,
	onProgress?: (progress: DownloadProgress) => void,
	signal?: AbortSignal,
	maxRetries = 3
): Promise<Blob> {
	const parts = new Map<number, Blob>();
	const queue = new RequestQueue(5, relaxedRateLimitGuard, maxRetries);
	const progressMap = new Map<number, number>();
	let downloadError: Error | null = null;

	const onPartProgress = (progress: DownloadProgress) => {
		if (!progress.part) return;
		progressMap.set(progress.part, progress.loaded);
		if (onProgress) {
			const totalProgress = Array.from(progressMap.values()).reduce(
				(a, b) => a + b,
				0,
			);
			onProgress({ loaded: totalProgress });
		}
	};

	queue.on("requestFinished", (data) => {
		const part = data as Part;
		parts.set(part.part_number, part.blob);
	});

	queue.on("requestFailed", (err) => {
		if (!downloadError) {
			downloadError = new Error(`Part download failed ${JSON.stringify(err)}`);
		}
		queue.cancel();
		console.error("Part download failed:", err);
	});

	// Add all part downloads to queue
	for (let i = 0; i <= number_of_parts; i++) {
		queue.add(() => DownloadPart(uuid, i, onPartProgress, signal));
	}

	// Check for errors every ~50ms
	const timer = setInterval(async () => {
		if (downloadError) {
			queue.cancel();
			clearInterval(timer);
			throw downloadError;
		}
	}, 50);
	await queue.awaitZeroRequests();
	clearInterval(timer);

	// Last check if any error occurred
	if (downloadError) {
		throw downloadError;
	}

	// Verify there are all parts
	for (let i = 0; i <= number_of_parts; i++) {
		if (!parts.has(i)) {
			throw new Error(`Missing part ${i} after download completion`);
		}
	}

	const sortedParts = Array.from(parts.entries())
		.sort(([a], [b]) => a - b)
		.map(([, blob]) => blob);

	console.log("Download complete", sortedParts);

	return new Blob(sortedParts);
}
