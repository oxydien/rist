export default interface UploadResponse {
  uuid: string;
  hash: string;
  size: number;
  content_type?: string;
}
