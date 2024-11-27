enum UploadErrorKind {
  Unknown = 'Unknown',
  InvalidUuid = 'InvalidUuid',
  InvalidDataSupplied = 'InvalidDataSupplied',
  UploadCanceled = 'UploadCanceled',
  AlreadyInProgress = 'AlreadyInProgress',
  FileTooLarge = 'FileTooLarge',
  FileMissing = 'FileMissing',
  ServerIssue = 'ServerIssue',
  NoPermissions = 'NoPermissions',
  IncorrectEndpoint = 'IncorrectEndpoint',
}
export default UploadErrorKind;
