import type FileState from "./FileState";
import type { FileUploadInfo } from "./FileUploadInfo";
import type UploadStatus from "./UploadStatus";

export default interface LocalUploadState {
  uuid: string | null;
  state: FileState;
  file: FileUploadInfo;
  status: UploadStatus | null;
  localProgress: number;
}
