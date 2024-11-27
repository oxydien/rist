import type UploadErrorKind from "./UploadErrorKind";

export default interface UploadError {
  uuid?: string;
  kind: UploadErrorKind;
  status: number;
  message?: string;
}
