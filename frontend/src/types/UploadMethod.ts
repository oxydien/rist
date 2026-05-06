enum UploadMethod {
  UNKNOWN = 0,
  ENTIRE = 1,
  CHUNKED = 2,

  AUTOMATIC = 30
}

export default UploadMethod;

export function uploadMethodToString(method: UploadMethod): string {
  switch (method) {
    case UploadMethod.UNKNOWN:
      return "Cached";
    case UploadMethod.ENTIRE:
      return "Entire";
    case UploadMethod.CHUNKED:
      return "Chunked";
    case UploadMethod.AUTOMATIC:
      return "Auto";
    default:
      return "Unknown";
  }
}
