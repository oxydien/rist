import type { FileUploadInfo } from "../../../types/FileUploadInfo";
import type UploadRequestResponse from "../../../types/UploadRequestResponse";
import { getModuleRoute } from "../../staticRoutes";

export function uploadRequest(file: FileUploadInfo): Promise<UploadRequestResponse> {
  const url = getModuleRoute("UPLOAD_REQUEST");

  if (!url) {
    throw new Error("Module not found");
  }

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(file),
  }).then((res) => {
    if (res.ok) {
      return res.json() as Promise<UploadRequestResponse>;
    }
    throw new Error(`Upload request failed with ${res.status} ${res.statusText} ${res.text()}`);
  }).catch((error) => {
    throw new Error(error);
  });
}
