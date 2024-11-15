import type LocalUploadState from "../../types/LocalUploadState";
import "../../assets/styles/private/uploaditem.css";
import Button from "../common/Button";
import { uploadMethodToString } from "../../types/UploadMethod";
import formatDate from "../../utils/date";
import { formatBytes } from "../../utils/math/bytes";
import FileState, { fileStateToString } from "../../types/FileState";
import { getIcon } from "../../utils/iconReg";

interface UploadItemProps {
  lus: LocalUploadState;
  onCancel?: (uuid: string) => void;
}

export const UploadItem = ({ lus, onCancel }: UploadItemProps) => {
  const state = lus.status?.state ?? lus.state;
  const showUUID = [FileState.Finishing, FileState.Completed, FileState.Uploading, FileState.Uploading].includes(state);
  let stateColor = "surface-0";
  switch (state) {
    case FileState.Queued:
      stateColor = "yellow";
      break;
    case FileState.ReadyToUpload:
      stateColor = "mauve";
      break;
    case FileState.Uploading:
      stateColor = "green";
      break;
    case FileState.UploadCancelled:
      stateColor = "peach";
      break;
    case FileState.Error:
      stateColor = "maroon";
      break;
    case FileState.AwaitingData:
      stateColor = "lavender";
      break;
    case FileState.Finishing:
    case FileState.Completed:
      stateColor = "teal";
      break;
  }
  let stateIcon = "upload";
  switch (state) {
    case FileState.Queued:
      stateIcon = "file-time";
      break;
    case FileState.ReadyToUpload:
      stateIcon = "progress-help";
      break;
    case FileState.AwaitingData:
      stateIcon = "database-share";
      break;
    case FileState.Uploading:
      stateIcon = "upload";
      break;
    case FileState.UploadCancelled:
      stateIcon = "cancel";
      break;
    case FileState.Error:
      stateIcon = "error";
      break;
    case FileState.Finishing:
      stateIcon = "cogs";
      break;
    case FileState.Completed:
      stateIcon = "check";
      break;
  }
  const localProgress = state === FileState.Completed ? 100 : Math.round((lus.localProgress / lus.file.size) * 100);
  const remoteProgress =
    state === FileState.Completed
      ? 100
      : Math.round(((lus.status?.uploaded_bytes ?? 0) / (lus.status?.total_bytes ?? 1)) * 100);

  const iconState = getIcon(stateIcon);
  console.log(iconState, state);

  return (
    <div className="upload-item">
      <div className="upload-state">
        <div
          className="local-progress"
          style={`--_color:hsl(var(--${stateColor}-color)/0.4); --_percentage:${localProgress}%`}
        />
        <div
          className="remote-progress"
          style={`--_color:hsl(var(--${stateColor}-color)); --_percentage:${remoteProgress}%`}
        />
        <div className="upload-icon-wrapper">
          <div className="upload-icon-background" />
          {iconState}
        </div>
      </div>
      <div className="upload-info">
        <div className="state-info">
          <div className="file-state">
            {fileStateToString(state)}{" "}
            {lus.status?.parts && (
              <span>
                {lus.status?.parts[0]}/{lus.status?.parts[1]}
              </span>
            )}
          </div>
          <div className="file-name">{lus.file.name}</div>
        </div>
        <div className="local-info">
          <div className="upload-info-main">
            <div className="upload-info-headers">
              <div className="upload-method-header">
                Method {showUUID && uploadMethodToString(lus.file.uploadMethod)}
              </div>
              <div className="upload-expiration-header">Expiration {showUUID && formatDate(lus.file.expiration)}</div>
              <div className="upload-size-header">Size {showUUID && formatBytes(lus.file.size)}</div>
            </div>
            {showUUID ? (
              <div className="upload-uuid">{lus.uuid && <div>{lus.uuid}</div>}</div>
            ) : (
              <>
                <div className="upload-method">{uploadMethodToString(lus.file.uploadMethod)}</div>
                <div className="upload-expiration">{formatDate(lus.file.expiration)}</div>
                <div className="upload-size">{formatBytes(lus.file.size)}</div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="action-wrapper">
        <Button>YES</Button>
      </div>
    </div>
  );
};
