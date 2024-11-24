import { create } from "zustand";
import type AppStore from "../types/AppStore";
import type ModuleInfo from "../types/ModuleInfo";
import type ServerInfo from "../types/ServerInfo";

export const useAppStore = create<AppStore>((set) => ({
	token: "",
	role: -1,
	modules: [],
	serverInfo: null,
	asideOpen: false,
	toggleAside: () => set((state) => ({ asideOpen: !state.asideOpen })),
	updateToken: (token: string) => set({ token }),
	updateRole: (role: number) => set({ role }),
	updateModules: (modules: ModuleInfo[]) => set({ modules }),
	updateServerInfo: (serverInfo: ServerInfo) =>
		set((state) => {
			state.updateModules(serverInfo.modules);
			return { serverInfo: { ...state.serverInfo, ...serverInfo } };
		}),
}));

export function getToken(): string | null {
	return useAppStore.getState().token || localStorage.getItem("token");
}
