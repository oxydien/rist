import { create } from 'zustand'
import type AppStore from '../types/AppStore'
import type ModuleInfo from '../types/ModuleInfo'
import type ServerInfo from '../types/ServerInfo'

export const useAppStore = create<AppStore>((set) => ({
  token: '',
  role: -1,
  modules: [{
    name: 'Upload',
    apiRoutes: new Map([['UPLOAD_REQUEST', '/api/upload/request'], ['UPLOAD_STATUS', '/api/upload_status/<uuid>'], ['UPLOAD_ENTIRE', '/api/upload/<uuid>'], ['UPLOAD_PART', '/api/upload/part/<uuid>/<part_number>']]),
    version: '0.2.0',
    summary: 'Store and share your files, up to 12GB in size, on the server.',
    iconName: 'upload',
    moduleDashUrl: 'upload',
  },
  {
    name: 'Yt-dlp Download',
    apiRoutes: new Map([['YOUTUBE_REQUEST', '/api/youtube/request'], ['YOUTUBE_DOWNLOAD', '/api/youtube/download/<uuid>']]),
    version: '0.2.0',
    summary: 'Download files from YouTube using yt-dlp',
    iconName: 'youtube',
    moduleDashUrl: 'youtube',
  },
  {
    name: 'Medal Download',
    apiRoutes: new Map([['MEDAL_DOWNLOAD', '/api/medal']]),
    version: '0.2.0',
    summary: 'Download files from Medal using yt-dlp',
    iconName: 'medal',
    moduleDashUrl: 'medal',
  }],
  serverInfo: null,
  updateToken: (token: string) => set({ token }),
  updateRole: (role: number) => set({ role }),
  updateModules: (modules: ModuleInfo[]) => set({ modules }),
  updateServerInfo: (serverInfo: ServerInfo) => set({ serverInfo }),
}))
