import type UploadMethod from "./UploadMethod";

export interface DownloadFileInfo {
  uuid: string;
  recommended_method: UploadMethod;
  filename: string;
  file_type: string;
  size: number;
  parts?: number; // from 0 to the total number of parts
  ready: boolean;
}
