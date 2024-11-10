import { create } from 'zustand'
import type AppStore from '../types/AppStore'

export const useAppStore = create<AppStore>((set) => ({
  token: '',
  role: -1,
  updateToken: (token: string) => set({ token }),
  updateRole: (role: number) => set({ role }),
}))
