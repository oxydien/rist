import { useCallback, useState } from "preact/hooks";
import type { FileUploadInfo } from "../../types/FileUploadInfo";
import Button from "../common/Button";
import UploadMethod from "../../types/UploadMethod";
import ChipsSelect from "../common/ChipsSelect";
import Input from "../common/Input";
import UploadExpiration from "../../types/UploadExpiration";
import DragChecker from "../../utils/DragChecker";
import { formatBytes } from "../../utils/math/bytes";

interface UploadWidgetProps {
  handleUpload?: (fui: FileUploadInfo) => void;
}

export function UploadWidget({ ...props }: UploadWidgetProps) {
  import("../../assets/styles/private/uploadwidget.css");

  const [expiration, setExpiration] = useState<UploadExpiration>(UploadExpiration.ONE_HOUR);
  const [customExpiration, setCustomExpiration] = useState<number>(new Date().getTime());
  const [fileInfo, setFileInfo] = useState<FileUploadInfo>({
    name: "",
    size: 0,
    type: "",
    uploadMethod: UploadMethod.CHUNKED,
    expiration: 0,
    blob: null,
  });

  const [isDragging, setIsDragging] = DragChecker(".upload-widget");

  const handleSelectFile = useCallback(
    (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        setFileInfo({
          ...fileInfo,
          name: file.name,
          size: file.size,
          type: file.type,
          blob: file,
        });
      }
      setIsDragging(false);
    },
    [fileInfo, setIsDragging]
  );

  const handleUploadMethodChange = (method: UploadMethod) => {
    setFileInfo({ ...fileInfo, uploadMethod: method });
  };

  const handleExpirationChange = (expiration: UploadExpiration) => {
    setExpiration(expiration);
  };

  const handleCustomExpiration = useCallback(() => {
    const input = document.getElementById("uploadExpirationInput") as HTMLInputElement;
    input?.showPicker();
  }, []);

  const handleCustomExpirationChange = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    console.log("custom expiration", target.valueAsNumber);
    setCustomExpiration(target.valueAsNumber);
  }, []);

  const handleUploadClick = useCallback(() => {
    if (!fileInfo.blob) {
      return;
    }
    switch (expiration) {
      case UploadExpiration.NEVER:
        fileInfo.expiration = 0;
        break;
      case UploadExpiration.ONE_HOUR:
        fileInfo.expiration = Date.now() + 1000 * 60 * 60;
        break;
      case UploadExpiration.ONE_DAY:
        fileInfo.expiration = Date.now() + 1000 * 60 * 60 * 24;
        break;
      case UploadExpiration.ONE_WEEK:
        fileInfo.expiration = Date.now() + 1000 * 60 * 60 * 24 * 7;
        break;
      case UploadExpiration.CUSTOM:
        fileInfo.expiration = customExpiration;
        break;
    }
    if (props.handleUpload) {
      props.handleUpload(fileInfo);
    }
  }, [fileInfo, props.handleUpload]);

  return (
    <div className="upload-widget">
      <label
        htmlFor="bigFileInput"
        className={`big-file-input-label ${fileInfo.blob === null || isDragging ? "" : "hidden"}`}
        data-dragging={isDragging}
      >
        <strong>Drag and drop or select a file</strong>
        <input
          type="file"
          id="bigFileInput"
          className={`big-file-input ${fileInfo.blob === null || isDragging ? "" : "hidden"}`}
          data-dragging={isDragging}
          onChange={handleSelectFile}
        />
      </label>
      <div className="upload-widget-container">
        <div className="file-info">
          {fileInfo.blob !== null && <strong className="file-name">{fileInfo.name}</strong>}
          <span className="file-info-line file-type">{fileInfo.type || "File Type"}</span>
          <span className="file-info-line file-size">{fileInfo.size ? formatBytes(fileInfo.size) : "File Size"}</span>
          <Button
            className="upload-prompt-button"
            onClick={() => {
              const input = document.getElementById("bigFileInput") as HTMLInputElement;
              input.click();
            }}
          >
            {fileInfo.blob !== null ? "Change file" : "Select a file"}
          </Button>
        </div>
        <div className="upload-options">
          <div className="upload-option-group upload-method">
            <strong>Upload Method</strong>
            <ChipsSelect<UploadMethod>
              options={[
                { label: "Entire", value: UploadMethod.ENTIRE },
                { label: "Chunked", value: UploadMethod.CHUNKED },
              ]}
              value={fileInfo.uploadMethod}
              onChange={(selected) => handleUploadMethodChange(selected[0] as UploadMethod)}
            />
          </div>
          <div className="upload-option-group upload-file-name">
            <strong>Save as (filename)</strong>
            <Input
              value={fileInfo.name}
              placeholder="File Name"
              onChange={(event) =>
                setFileInfo({
                  ...fileInfo,
                  name: (event?.target as HTMLInputElement).value,
                })
              }
            />
          </div>
          <div className="upload-option-group upload-expiration">
            <div>
              <strong>Expiration</strong>
              <input
                type="date"
                id="uploadExpirationInput"
                value={customExpiration}
                onChange={handleCustomExpirationChange}
                className="upload-expiration-input"
              />
            </div>
            <ChipsSelect<UploadExpiration>
              options={[
                { label: "Never", value: UploadExpiration.NEVER },
                { label: "1 hour", value: UploadExpiration.ONE_HOUR },
                { label: "1 day", value: UploadExpiration.ONE_DAY },
                { label: "1 week", value: UploadExpiration.ONE_WEEK },
                {
                  label: `${
                    expiration === UploadExpiration.CUSTOM ? new Date(customExpiration).toLocaleDateString() : "Custom"
                  }`,
                  value: UploadExpiration.CUSTOM,
                  onSelect: handleCustomExpiration,
                },
              ]}
              value={expiration}
              onChange={(selected) => handleExpirationChange(selected[0] as UploadExpiration)}
            />
          </div>
          <div className="upload-options-group upload-submit">
            <Button variant="primary" onClick={handleUploadClick}>
              Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
