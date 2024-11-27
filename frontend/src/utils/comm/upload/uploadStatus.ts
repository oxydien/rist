import { updateUploadStatus } from "../../../stores/uploadStore";
import FileState from "../../../types/FileState";
import type UploadError from "../../../types/UploadError";
import type UploadStatus from "../../../types/UploadStatus";
import { getModuleRoute } from "../../staticRoutes";
import { relaxedRateLimitGuard } from "../_default";
import RequestQueue from "../requestQueue";

export function uploadStatus(
	uuid: string,
): Promise<UploadStatus | UploadError> {
	const url = getModuleRoute("UPLOAD_STATUS")?.replace("<uuid>", uuid);

	if (!url) {
		throw new Error("Module not found");
	}
	return fetch(url).then((res) => {
		if (res.ok) {
			return res.json();
		}
		throw new Error(`HTTP error! status: ${res.status}`);
	});
}

/**
 * Checks the upload status until it is completed or an error occurs.
 *
 * @param uuid UUID of the upload to check
 * @returns Empty string if the upload is completed, or an error message if the upload fails or an error occurs while checking the status
 */
export async function checkUploadStatus(uuid: string): Promise<string> {
	const queue = new RequestQueue(1, relaxedRateLimitGuard, 5);
	let continueFlag = true;
	let failMessage = "Could not check upload status";
	let response: UploadStatus | UploadError | null = null;

	queue.on("requestFinished", (data) => {
		response = data as UploadStatus | UploadError;
	});

	queue.on("requestFailed", (data) => {
		continueFlag = false;
		failMessage = data as string;
	});

	while (continueFlag) {
		try {
			const time = new Date().getTime();
			queue.add(() => uploadStatus(uuid));
			await queue.awaitZeroRequests();
			const status = response as unknown | UploadStatus | UploadError;

			if (
				typeof status === "object" &&
				status !== null &&
				"message" in status
			) {
				continueFlag = false;
				throw new Error(
					`Upload error while checking status: ${status.message}`,
				);
			}

			if (typeof status === "object" && status !== null && "state" in status) {
				if (status.state === FileState.Completed) {
					failMessage = "";
					continueFlag = false;
					continue;
				}

				updateUploadStatus(uuid, status as UploadStatus);
			}

			const waitTime = Math.max(0, 2000 - (new Date().getTime() - time));
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		} catch (error) {
			console.error(error);
			continueFlag = false;
		}
	}

	return failMessage;
}
