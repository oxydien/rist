import type UploadMethod from "./UploadMethod";

export default interface UploadRequest {
  upload_method: UploadMethod;
  file_size: number;
  file_name: string;
  file_hash: string;
  expires_at: number;
  shorten: boolean;
}
