enum FileState {
  AwaitingData = 0,
  Uploading = 1,
  Finishing = 2,
  Error = 3,
  UploadCancelled = 4,
  Completed = 5,
}
export default FileState;
