import type ModuleInfo from "./ModuleInfo";
import type ServerInfo from "./ServerInfo";

export default interface AppStore {
  token: string;
  role: number;
  modules: ModuleInfo[];
  serverInfo: ServerInfo | null,
  asideOpen: boolean,
  toggleAside: () => void
  updateToken: (token: string) => void
  updateRole: (role: number) => void
  updateModules: (modules: ModuleInfo[]) => void
  updateServerInfo: (serverInfo: ServerInfo) => void
}
