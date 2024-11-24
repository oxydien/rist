import type DownloadProgress from "../../../types/DownloadProgress";
import { getRoute } from "../../staticRoutes";

export async function DownloadEntireFile(
	uuid: string,
	onProgress: (progress: DownloadProgress) => void,
): Promise<Blob> {
	const url = getRoute("DOWNLOAD_ENTIRE")?.replace("<uuid>", uuid);

	if (!url) {
		throw new Error("Failed to construct download URL");
	}

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/octet-stream",
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`HTTP error! status: ${response.status}, ${response.statusText}, ${errorText}`,
		);
	}

	if (response.body === null) {
		throw new Error("Response body is null");
	}

	if (!onProgress) {
		return response.blob();
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let loadedBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			loadedBytes += value.length;
			onProgress({ loaded: loadedBytes });
		}
		return new Blob(chunks);
	} catch (error) {
		throw new Error(`Error reading response stream: ${error}`);
	} finally {
		reader.cancel();
	}
}
