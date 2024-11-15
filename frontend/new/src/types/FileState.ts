enum FileState {
  AwaitingData = 0,
  Uploading = 1,
  Finishing = 2,
  Error = 3,
  UploadCancelled = 4,
  Completed = 5,

  // Local (only used for frontend)
  Queued = 205,
  ReadyToUpload = 206,
}
export default FileState;

export function fileStateToString(state: FileState): string {
  switch (state) {
    case FileState.AwaitingData:
      return "Awaiting Data";
    case FileState.Uploading:
      return "Uploading";
    case FileState.Finishing:
      return "Finishing";
    case FileState.Error:
      return "Error";
    case FileState.UploadCancelled:
      return "Upload Cancelled";
    case FileState.Completed:
      return "Completed";
    case FileState.Queued:
      return "Queued";
    case FileState.ReadyToUpload:
      return "Ready To Upload";
    default:
      return "Unknown";
  }
}
