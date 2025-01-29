import type ModuleInfo from "./ModuleInfo";

export default interface ServerInfo {
  software: string;
  version: string;
  repository: string;
  issues: string;
  license: string;
  modules: ModuleInfo[];
}
