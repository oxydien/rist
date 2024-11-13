import FileState from "../../../types/FileState";
import type { FileUploadInfo } from "../../../types/FileUploadInfo";
import type UploadRequestResponse from "../../../types/UploadRequestResponse";
import type UploadResponse from "../../../types/UploadResponse";
import type UploadStatus from "../../../types/UploadStatus";
import { getModuleRoute } from "../../staticRoutes";

export default async function chunkedUpload(
	fileInfo: FileUploadInfo,
	uuid: string,
	requestResponse: UploadRequestResponse,
	callback: (progress: UploadStatus) => void,
): Promise<UploadResponse> {
	if (!fileInfo.blob) {
		throw new Error("Blob is null");
	}
	if (!requestResponse.upload_parts) {
		throw new Error("Number of parts not specified");
	}

	const CHUNK_SIZE = Math.ceil(fileInfo.size / requestResponse.upload_parts);
	let uploadedBytes = 0;
	let currentPart = 0;

	const chunkPromises: Promise<Response>[] = [];
	const fileBuffer = await fileInfo.blob.arrayBuffer();

	// Update initial status
	callback({
		upload_method: fileInfo.uploadMethod,
		state: FileState.ReadyToUpload,
		total_bytes: fileInfo.size,
		uploaded_bytes: 0,
		parts: [0, 0],
	});

	// Get base URL
	const baseUrl = getModuleRoute("CHUNKED_UPLOAD")?.replace("<uuid>", uuid);

	if (!baseUrl) {
		throw new Error("Failed to get base URL");
	}

	for (let i = 0; i < requestResponse.upload_parts; i++) {
		const start = i * CHUNK_SIZE;
		const end = Math.min(start + CHUNK_SIZE, fileInfo.size);
		const chunkData = fileBuffer.slice(start, end);

		const uploadChunk = async () => {
			try {
				const response = await fetch(
					baseUrl.replace("<part_number>", i.toString()),
					{
						method: "POST",
						body: chunkData,
					},
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// Update progress
				uploadedBytes += end - start;
				currentPart++;

				callback({
					upload_method: fileInfo.uploadMethod,
					state: FileState.Uploading,
					total_bytes: fileInfo.size,
					uploaded_bytes: uploadedBytes,
					parts: [currentPart, requestResponse.upload_parts ?? 0 + 1],
				});

				return response;
			} catch (error) {
				console.error(`Chunk ${i} failed:`, error);
				throw error;
			}
		};

		chunkPromises.push(uploadChunk());
	}

	try {
		// Wait for all chunks to complete
		const responses = await Promise.all(chunkPromises);

		// Get the final response from the last chunk
		const finalResponse = await responses[responses.length - 1].json();

		callback({
			upload_method: fileInfo.uploadMethod,
			state: FileState.Completed,
			total_bytes: fileInfo.size,
			uploaded_bytes: fileInfo.size,
			parts: [requestResponse.upload_parts, requestResponse.upload_parts],
		});

		return finalResponse;
	} catch (error) {
		callback({
			upload_method: fileInfo.uploadMethod,
			state: FileState.Error,
			total_bytes: fileInfo.size,
			uploaded_bytes: uploadedBytes,
			parts: [currentPart, requestResponse.upload_parts],
		});

		throw error;
	}
}
