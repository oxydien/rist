import { create } from "zustand";
import type UploadStore from "../types/UploadStore";
import FileState from "../types/FileState";
import type LocalUploadState from "../types/LocalUploadState";
import type UploadStatus from "../types/UploadStatus";

export const useUploadStore = create<UploadStore>((set) => ({
  uploads: [],

  getByUuid(uuid) {
    return this.uploads.find((f) => f.uuid === uuid);
  },
  getByFile(file) {
    return this.uploads.find((f) => f.file.blob === file.blob);
  },
  getCurrentUploads() {
    return this.uploads.filter((f) =>
      [FileState.AwaitingData, FileState.ReadyToUpload, FileState.Uploading, FileState.Finishing].includes(f.state)
    ).length;
  },
  addUpload(lus) {
    set((state) => ({ uploads: [...state.uploads, lus] }));
  },
  updateUpload(uuid, lus) {
    set((state) => ({ uploads: state.uploads.map((f) => (f.uuid === uuid ? lus : f)) }));
  },
  updateUploadByFile(lus) {
    set((state) => {
      const index = state.uploads.findIndex((f) => f.file.blob === lus.file.blob);
      if (index !== -1) {
        const newUploads = [...state.uploads];
        newUploads[index] = lus;
        return { uploads: newUploads };
      }
      return state;
    });
  },
  updateUploadStatus(uuid, status) {
    set((state) => ({ uploads: state.uploads.map((f) => (f.uuid === uuid ? { ...f, status } : f)) }));
  },
  updateUploadLocalProgress(uuid, progress) {
    set((state) => ({ uploads: state.uploads.map((f) => (f.uuid === uuid ? { ...f, localProgress: progress } : f)) }));
  },
}));

// When outside of a component
export function getByUuid(uuid: string): LocalUploadState | undefined {
  return useUploadStore.getState().uploads.find((f) => f.uuid === uuid);
}

export function getCurrentUploads() {
  const state = useUploadStore.getState();
  return state.uploads.filter((f) =>
    [FileState.AwaitingData, FileState.ReadyToUpload, FileState.Uploading, FileState.Finishing].includes(f.state)
  ).length;
}

export function addUpload(lus: LocalUploadState) {
  useUploadStore.setState((state) => {
    const newUploads = [...state.uploads];
    newUploads.push(lus);
    return { uploads: newUploads };
  });
}

export function updateUpload(uuid: string, lus: LocalUploadState) {
  useUploadStore.setState((state) => ({ uploads: state.uploads.map((f) => (f.uuid === uuid ? lus : f)) }));
}

export function updateUploadByFile(lus: LocalUploadState) {
  useUploadStore.setState((state) => {
    const index = state.uploads.findIndex((f) => f.file.blob === lus.file.blob);
    if (index !== -1) {
      const newUploads = [...state.uploads];
      newUploads[index] = lus;
      return { uploads: newUploads };
    }
    return state;
  });
}
export function updateUploadStatus(uuid: string, status: UploadStatus) {
  useUploadStore.setState((state) => ({ uploads: state.uploads.map((f) => (f.uuid === uuid ? { ...f, status } : f)) }));
}
export function updateUploadLocalProgress(uuid: string, progress: number) {
  useUploadStore.setState((state) => ({
    uploads: state.uploads.map((f) => (f.uuid === uuid ? { ...f, localProgress: progress } : f)),
  }));
}
