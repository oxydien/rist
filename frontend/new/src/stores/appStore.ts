import { create } from 'zustand'
import type AppStore from '../types/AppStore'
import type ModuleInfo from '../types/ModuleInfo'

export const useAppStore = create<AppStore>((set) => ({
  token: '',
  role: -1,
  modules: [{
    name: 'Upload',
    version: '0.2.0',
    summary: 'Store and share your files, up to 12GB in size, on the server.',
    iconName: 'upload',
    moduleDashUrl: 'upload',
  },
  {
    name: 'Yt-dlp Download',
    version: '0.2.0',
    summary: 'Download files from YouTube using yt-dlp',
    iconName: 'youtube',
    moduleDashUrl: 'youtube',
  },
  {
    name: 'Medal Download',
    version: '0.2.0',
    summary: 'Download files from Medal using yt-dlp',
    iconName: 'medal',
    moduleDashUrl: 'medal',
  }],
  updateToken: (token: string) => set({ token }),
  updateRole: (role: number) => set({ role }),
  updateModules: (modules: ModuleInfo[]) => set({ modules }),
}))
