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
    uploadMethod: UploadMethod.AUTOMATIC,
    expiration: 0,
    blob: null,
    shorten: false,
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

  const handleShortenChange = (shorten: boolean) => {
    setFileInfo({ ...fileInfo, shorten });
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
        fileInfo.expiration = (Date.now() + 1000 * 60 * 60);
        break;
      case UploadExpiration.ONE_DAY:
        fileInfo.expiration = (Date.now() + 1000 * 60 * 60 * 24);
        break;
      case UploadExpiration.ONE_WEEK:
        fileInfo.expiration = (Date.now() + 1000 * 60 * 60 * 24 * 7);
        break;
      case UploadExpiration.ONE_MONTH:
        fileInfo.expiration = (Date.now() + 1000 * 60 * 60 * 24 * 7 * 30);
        break;
      case UploadExpiration.CUSTOM:
        fileInfo.expiration = customExpiration;
        break;
    }
    fileInfo.expiration = Math.round(fileInfo.expiration / 1000);

    if (props.handleUpload) {
      props.handleUpload({...fileInfo});
    }
  }, [fileInfo, props.handleUpload, expiration, customExpiration]);

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
            <strong
                className="has-answer"
                title="How should this file be uploaded to the server. If you don't know what this is, leave the automatic. Entire -> sends the entire file at once. Chunked -> Splits the file into ~5MB chunks and sends them invidually."
              >Upload Method
            </strong>
            <ChipsSelect<UploadMethod>
              options={[
                { label: "Automatic", value: UploadMethod.AUTOMATIC },
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
              <strong className="has-answer" title="For how long do you need to have this file here. OR When this file should be removed from the server.">Expiration</strong>
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
                { label: "1 hour", value: UploadExpiration.ONE_HOUR },
                { label: "1 day", value: UploadExpiration.ONE_DAY },
                { label: "1 week", value: UploadExpiration.ONE_WEEK },
                { label: "1 month", value: UploadExpiration.ONE_MONTH },
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
          <div className="upload-option-group upload-shorten">
            <strong className="has-answer" title="Makes the link you copy shorter. Use when needed, it's not short by default for a reason.">Short link</strong>
            <ChipsSelect<boolean>
                options={[
                  { label: "Long is fine", value: false },
                  { label: "Shorten it please", value: true },
                ]}
                value={fileInfo.shorten}
                onChange={(selected) => handleShortenChange(selected[0])}
            />
          </div>
        </div>
        <div className="upload-options-group upload-submit">
          <Button variant="primary" onClick={handleUploadClick}>
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
