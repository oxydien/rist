import { getToken } from "../../../stores/appStore";
import type { FileUploadInfo } from "../../../types/FileUploadInfo";
import { getModuleRoute } from "../../staticRoutes";

export async function UploadEntireBuffer(buffer: ArrayBuffer, uuid: string) {
  const url = getModuleRoute("UPLOAD_ENTIRE")?.replace("<uuid>", uuid);
  const token = getToken();

  if (!url) {
    throw new Error("Module not found");
  }

  if (!token) {
    throw new Error("Token not found");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: buffer,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("UploadEntireFile failed:", error);
    throw error;
  }
}

export async function UploadEntireFile(file: FileUploadInfo, uuid: string) {
  if (!file.blob) {
    throw new Error("Blob is null");
  }
  const buffer = await file.blob.arrayBuffer();
  return await UploadEntireBuffer(buffer, uuid);
}
