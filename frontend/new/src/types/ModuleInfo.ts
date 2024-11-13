export default interface ModuleInfo {
  name: string;
  apiRoutes: Map<string, string>;
  version: string;
  summary: string;
  iconName: string;
  moduleDashUrl: string;
}
