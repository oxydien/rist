import type ModuleInfo from "./ModuleInfo";

export default interface AppStore {
  token: string;
  role: number;
  modules: ModuleInfo[];
  updateToken: (token: string) => void
  updateRole: (role: number) => void
  updateModules: (modules: ModuleInfo[]) => void
}
