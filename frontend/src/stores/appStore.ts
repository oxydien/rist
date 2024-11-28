import { create } from "zustand";
import type AppStore from "../types/AppStore";
import type ModuleInfo from "../types/ModuleInfo";
import type ServerInfo from "../types/ServerInfo";

export const useAppStore = create<AppStore>((set) => ({
	token: "",
	role: -1,
	modules: [],
	serverInfo: null,
	asideOpen: window.innerWidth > 756,
	moduleData: new Map<string, unknown>(),
	toggleAside: () => set((state) => ({ asideOpen: !state.asideOpen })),
	updateToken: (token: string) => {
		localStorage.setItem("token", token);
		document.cookie = `token=${token}; path=/`;
		set({ token });
	},
	updateRole: (role: number) => set({ role }),
	updateModules: (modules: ModuleInfo[]) => set({ modules }),
	updateServerInfo: (serverInfo: ServerInfo) =>
		set((state) => {
			state.updateModules(serverInfo.modules);
			return { serverInfo: { ...state.serverInfo, ...serverInfo } };
		}),

	getModuleData: (key: string): unknown => {
		return useAppStore.getState().moduleData.get(key);
	},
	updateModuleData: (key: string, value: unknown) => {
		set((state) => {
			const newData = new Map(state.moduleData);
			newData.set(key, value);
			return { moduleData: newData };
		});
	},
}));

export function getToken(): string | null {
	return useAppStore.getState().token || localStorage.getItem("token");
}

export function isAuthorized(): boolean {
	return useAppStore.getState().role >= 0 && getToken() !== null;
}
