enum UploadMethod {
  UNKNOWN = 0,
  ENTIRE = 1,
  CHUNKED = 2,
}

export default UploadMethod;

export function uploadMethodToString(method: UploadMethod): string {
  switch (method) {
    case UploadMethod.UNKNOWN:
      return "Unknown";
    case UploadMethod.ENTIRE:
      return "Entire";
    case UploadMethod.CHUNKED:
      return "Chunked";
    default:
      return "Unknown";
  }
}
