import { UploadWidget } from "../../components/modules/UploadWidget";
import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";
import { setError, useUploadStore } from "../../stores/uploadStore";
import { useCallback } from "preact/hooks";
import { upload } from "../../utils/comm/upload/uploadWrapper";
import type { FileUploadInfo } from "../../types/FileUploadInfo";
import { UploadItem } from "../../components/modules/UploadItem";

export default function DashboardPage() {
	import("../../assets/styles/private/main.css");
	import("../../assets/styles/private/upload.css");

	const localUpload = useCallback(async (fui: FileUploadInfo) => {
		try {
			await upload(fui);
		} catch (e) {
			if (e instanceof Error) {
				console.error("Error while uploading", fui, "Error:", e.message);
				setError(fui, e.message);
			} else {
				console.error("Error while uploading", fui, "Error:", e);
				setError(fui, JSON.stringify(e));
			}
		}
	}, []);

	return (
		<PageWrapper>
			<Aside />

			<main>
				<h1>Upload</h1>
				<UploadWidget handleUpload={localUpload} />

				<div className="uploads">
					{useUploadStore().uploads.map((upload) => (
						// There can be multiple uploads with same uuid, when server
						// already has an upload for the file
						<UploadItem lus={upload} key={`${upload.uuid}_${Math.random()}`} />
					))}
				</div>
			</main>
		</PageWrapper>
	);
}
