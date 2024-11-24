import type { DownloadFileInfo } from "../../../types/DownloadFileInfo";
import { getRoute } from "../../staticRoutes";

/**
 * Fetches the download info for a given file from the server.
 *
 * @param uuid The UUID of the file to fetch download info for.
 * @returns A promise that resolves to the download info for the file.
 * @throws An error if the fetch fails.
 */
export async function get_download_info(
	uuid: string,
): Promise<DownloadFileInfo> {
	const url = getRoute("DOWNLOAD_INFO")?.replace("<uuid>", uuid);

	return fetch(url)
		.then(async (res) => {
			if (res.ok) {
				return res.json() as Promise<DownloadFileInfo>;
			}
			return Promise.reject(
				new Error(
					`Download info fetch failed with ${res.status} ${res.statusText} ${await res.text()}`,
				),
			);
		})
		.catch((error) => Promise.reject(error));
}
