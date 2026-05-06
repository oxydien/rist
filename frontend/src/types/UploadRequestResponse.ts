import type UploadMethod from "./UploadMethod";

export default interface UploadRequestResponse {
  approved: boolean;
  upload_id: string;
  upload_method: UploadMethod;
  /// Used for chunked upload
  upload_parts?: number;
  shortened_url?: string;
}
