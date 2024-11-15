import { UploadWidget } from "../../components/modules/UploadWidget";
import Aside from "../../components/common/nav/Aside";
import PageWrapper from "./PageWrapper";
import { useUploadStore } from "../../stores/uploadStore";
import { useCallback } from "preact/hooks";
import { upload } from "../../utils/comm/upload/uploadWrapper";
import type { FileUploadInfo } from "../../types/FileUploadInfo";
import { UploadItem } from "../../components/modules/UploadItem";

export default function DashboardPage() {
  import("../../assets/styles/private/main.css");
  import("../../assets/styles/private/upload.css");

  const localUpload = useCallback((fui: FileUploadInfo) => {
    upload(fui);
  }, []);

  return (
    <PageWrapper>
      <Aside />

      <main>
        <h1>Upload</h1>
        <UploadWidget handleUpload={localUpload} />

        <div className="uploads">{useUploadStore().uploads.map((upload) => (
          <UploadItem lus={upload} key={upload.uuid} />
        ))}</div>
      </main>
    </PageWrapper>
  );
}
