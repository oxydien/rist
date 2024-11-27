import type UploadMethod from "./UploadMethod";

export interface FileUploadInfo {
  name: string;
  size: number;
  type: string;
  uploadMethod: UploadMethod;
  expiration: number;
  blob: Blob | null;
}
