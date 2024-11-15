import { addUpload, getCurrentUploads, updateUpload } from "../../../stores/uploadStore";
import FileState from "../../../types/FileState";
import type { FileUploadInfo } from "../../../types/FileUploadInfo";
import type LocalUploadState from "../../../types/LocalUploadState";
import type UploadError from "../../../types/UploadError";
import UploadMethod from "../../../types/UploadMethod";
import type UploadRequestResponse from "../../../types/UploadRequestResponse";
import { rateLimitGuard } from "../_default";
import RequestQueue from "../requestQueue";
import chunkedUpload from "./chunkedUpload";
import { UploadEntireFile } from "./entireUpload";
import { uploadRequest } from "./request";
import { checkUploadStatus } from "./uploadStatus";

/**
 * Maximum number of concurrent uploads to the server.
 *
 * By default set to `1`, as uploading multiple files at the same time can
 * overload the server, especially if it's not a CDN.
 * It's the most efficient to upload one file at a time for single backend server.
 */
const MAX_CONCURRENT_UPLOADS = 1;

export async function upload(file: FileUploadInfo) {
  if (!file.blob) {
    throw new Error("Blob is null");
  }

  const queue = new RequestQueue(1, rateLimitGuard, 2);

  const time = new Date().getTime();
  const tempUuid = `${time}-${file.name}`;
  const lus: LocalUploadState = {
    file,
    localProgress: 0,
    state: FileState.Queued,
    status: null,
    uuid: tempUuid,
  };
  addUpload(lus);

  while (getCurrentUploads() >= MAX_CONCURRENT_UPLOADS) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  lus.state = FileState.ReadyToUpload;
  updateUpload(tempUuid, lus);

  console.debug(`Uploading ${file.name}`);

  let resultData: unknown | UploadRequestResponse | null = null;
  let errorData: unknown | string | UploadError = null;

  queue.on("requestFinished", (data) => {
    resultData = data;
  });

  queue.on("requestFailed", (data) => {
    errorData = data;
  });

  let requestResponse: UploadRequestResponse | null = null;

  try {
    queue.add(() => uploadRequest(file));
    await queue.awaitZeroRequests();
    if (resultData === null) {
      throw new Error(`Upload request failed: ${errorData}`);
    }

    requestResponse = resultData as UploadRequestResponse;
    console.debug("Upload request finished:", requestResponse);
  } catch {
    lus.state = FileState.Error;
    updateUpload(tempUuid, lus);
    console.error("Upload request failed:", errorData);
    return;
  }

  if (requestResponse === null) {
    lus.state = FileState.Error;
    updateUpload(tempUuid, lus);
    throw new Error(`Upload request failed: ${errorData}`);
  }

  if (!requestResponse.approved) {
    lus.uuid = requestResponse.upload_id;
    lus.state = FileState.Completed;
    updateUpload(tempUuid, lus);
    console.debug("Upload finished (denied)");
    return;
  }

  const uploadMethod = requestResponse.upload_method;
  const uuid = requestResponse.upload_id;

  lus.uuid = uuid;
  lus.state = FileState.Uploading;
  updateUpload(tempUuid, lus);
  console.debug(`Upload method: ${uploadMethod}, uuid: ${uuid}`);

  if (uploadMethod === UploadMethod.CHUNKED) {
    queue.add(() => chunkedUpload(file, uuid, requestResponse, () => {}));
  } else {
    queue.add(() => UploadEntireFile(file, uuid));
  }

  try {
    await checkUploadStatus(uuid);
    await queue.awaitZeroRequests();

    lus.state = FileState.Completed;
    console.debug("Upload finished (completed)");
  } catch (e) {
    console.error(`Upload failed: ${e}`);
    lus.state = FileState.Error;
  } finally {
    updateUpload(uuid, lus);
  }
}
