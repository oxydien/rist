import type { FileUploadInfo } from "./FileUploadInfo";
import type LocalUploadState from "./LocalUploadState";
import type UploadStatus from "./UploadStatus";

export default interface UploadStore {
  uploads: LocalUploadState[];

  getByUuid(uuid: string): LocalUploadState | undefined;
  getByFile(file: FileUploadInfo): LocalUploadState | undefined;
  getCurrentUploads(): number;
  addUpload(lus: LocalUploadState): void;
  updateUpload(uuid: string, lus: LocalUploadState): void;
  updateUploadByFile(lus: LocalUploadState): void;
  updateUploadStatus(uuid: string, status: UploadStatus): void;
  updateUploadLocalProgress(uuid: string, progress: number): void;
}
