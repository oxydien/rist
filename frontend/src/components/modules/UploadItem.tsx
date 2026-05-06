import type LocalUploadState from "../../types/LocalUploadState";
import "../../assets/styles/private/uploaditem.css";
import Button from "../common/Button";
import {uploadMethodToString} from "../../types/UploadMethod";
import formatDate from "../../utils/date";
import {formatBytes} from "../../utils/math/bytes";
import FileState, {fileStateToString} from "../../types/FileState";
import {getIcon} from "../../utils/iconReg";
import {useCallback, useState} from "preact/hooks";

interface UploadItemProps {
	lus: LocalUploadState;
	onCancel?: (uuid: string | null) => void;
}

export const UploadItem = ({ lus, onCancel }: UploadItemProps) => {
	const state = lus.status?.state ?? lus.state;
	const [copiedFail, setCopiedFail] = useState(false);
	const showUUID = [
		FileState.Finishing,
		FileState.Completed,
		FileState.Uploading,
	].includes(state);
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
		case FileState.Hashing:
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
		case FileState.Hashing:
			stateIcon = "hash";
			break;
		case FileState.Completed:
			stateIcon = "check";
			break;
	}
	const localProgress = Math.round((lus.localProgress / lus.file.size) * 100);
	const remoteProgress = ![FileState.Uploading].includes(state)
		? 100
		: Math.round(
				((lus.status?.uploaded_bytes ?? 0) / (lus.status?.total_bytes ?? 1)) *
					100,
			);

	const iconState = getIcon(stateIcon);

	const cancelUpload = useCallback(() => {
		if (onCancel) {
			onCancel(lus.uuid);
		}
	}, [onCancel, lus.uuid]);

	const getUrl: () => string = () => {
		if (!lus.uuid) return "";
		return `${window.location.protocol}//${window.location.host}/f/${lus.shortened || lus.uuid}`;
	};

	const [copied, setCopied] = useState(false);
	const copyUrlToClipboard = useCallback(() => {
		if (!lus.uuid) return;
		const url = getUrl();
		try {
			navigator.clipboard.writeText(url);
		} catch (err) {
			setCopiedFail(true);
			return;
		}
		if (copied) return;
		setCopied(true);

		setTimeout(() => {
			setCopied(false);
		}, 1200);
	}, [lus.uuid, copied]);

	return (
		<div className="upload-item" data-uuid={lus.uuid}>
			<div className="upload-state">
				<div
					className="progress"
					style={`--_local-color:hsl(var(--${stateColor}-color)/0.4);--_remote-color:hsl(var(--${stateColor}-color));--_remote-progress:${remoteProgress}%;--_local-progress:${localProgress}%`}
				/>
				<div
					className="upload-icon-wrapper"
					style={`--_color:hsl(var(--${stateColor}-color));`}
				>
					{iconState({})}
				</div>
			</div>
			<div className="upload-info">
				<div className="state-info">
					<div className="file-state">
						{fileStateToString(state)}{" "}
						{state === FileState.Uploading && lus.status?.parts ? (
							<span>
								({lus.status?.parts[0]}/{lus.status?.parts[1]})
							</span>
						) : state === FileState.Uploading ? (
							<span>({remoteProgress}%)</span>
						) : null}
					</div>
					<div className="file-name" title={lus.file.name}>
						{lus.file.name}
					</div>
				</div>
				<div className="local-info">
					<div className="upload-info-headers">
						<div className="upload-method-header">
							Method: {showUUID && uploadMethodToString(lus.file.uploadMethod)}
						</div>
						<div
							className="upload-expiration-header"
							title={new Date(lus.file.expiration * 1000).toLocaleString()}
						>
							Expires:{" "}
							{showUUID &&
								(lus.file.expiration === 0
									? "never"
									: formatDate(lus.file.expiration * 1000))}
						</div>
						<div className="upload-size-header">
							Size: {showUUID && formatBytes(lus.file.size)}
						</div>
					</div>
					<div className="upload-info-main">
						{showUUID ? (
							<div className="upload-uuid">{ lus.shortened || lus.uuid }</div>
						) : (
							<>
								<div className="upload-method">
									{uploadMethodToString(lus.file.uploadMethod)}
								</div>
								<div
									className="upload-expiration"
									title={new Date(lus.file.expiration * 1000).toLocaleString()}
								>
									{formatDate(lus.file.expiration * 1000)}
								</div>
								<div className="upload-size">{formatBytes(lus.file.size)}</div>
							</>
						)}
					</div>
				</div>
			</div>
			<div className="action-wrapper">
				{[FileState.Finishing, FileState.Uploading].includes(state) && (
					copiedFail ? (
							<input
								type="text"
								className={"btn copy-fail"}
								value={getUrl()}
								readOnly
								onClick={(e) => (e.target as HTMLInputElement).select()}
							/>
						) : (
							<Button
								variant="default"
								iconOnly
								onClick={() => copyUrlToClipboard()}
							>
								{getIcon(copied ? "check" : "copy")({})}
							</Button>
						)
				)}
				{[FileState.Completed].includes(state) ? (
					copiedFail ? (
						<input
							type="text"
							className={"btn copy-fail"}
							value={getUrl()}
							readOnly
							onClick={(e) => (e.target as HTMLInputElement).select()}
						/>
					) : (
						<Button variant="default" onClick={() => copyUrlToClipboard()}>
							{getIcon(copied ? "check" : "copy")({})}{" "}
							<span>{copied ? "Copied!" : "Copy URL"}</span>
						</Button>
					)
				) : (
					<Button
						variant="destructive"
						onClick={() => cancelUpload()}
						iconOnly={copiedFail}
						disabled={onCancel === undefined}
					>
						{getIcon("cancel")({})}{!copiedFail && (<span>Cancel</span>)}
					</Button>
				)}
			</div>
			{lus.error && (
				<div className="error-wrapper">
					{getIcon("error")({})} {lus.error}
				</div>
			)}
		</div>
	);
};
