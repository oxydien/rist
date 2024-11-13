import type FileState from "./FileState";
import type UploadMethod from "./UploadMethod";

export default interface UploadStatus {
  upload_method: UploadMethod;
  state: FileState;
  total_bytes: number;
  uploaded_bytes: number;
  /// If upload_method is chunked, this will be a tuple of (current, max)
  parts?: [number, number];
}
