import { getToken } from "../../../stores/appStore";
import type { FileUploadInfo } from "../../../types/FileUploadInfo";
import UploadRequest from "../../../types/UploadRequest";
import type UploadRequestResponse from "../../../types/UploadRequestResponse";
import { getModuleRoute } from "../../staticRoutes";

export function uploadRequest(file: FileUploadInfo, hash?: string): Promise<UploadRequestResponse> {
  const url = getModuleRoute("UPLOAD_REQUEST");
  const token = getToken();

  if (!url) {
    throw new Error("Module not found");
  }

  if (!token) {
    throw new Error("Token not found");
  }

  const data: UploadRequest = {
    expires_at: file.expiration,
    file_hash: hash || "",
    file_name: file.name,
    file_size: file.size,
    upload_method: file.uploadMethod,
  };

  console.debug("Requesting upload", file, "data", data, url);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
    .then((res) => {
      if (res.ok) {
        return res.json() as Promise<UploadRequestResponse>;
      }
      throw new Error(`Upload request failed with ${res.status} ${res.statusText} ${res.text()}`);
    })
    .catch((error) => {
      throw new Error(error);
    });
}
