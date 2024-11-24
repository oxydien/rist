export const BASE_URL = "http://10.0.0.50:3003";

export const routes = {
  AUTHORIZATION: "/api/authorize",
  SERVER_INFO: "/api/info",
  DOWNLOAD_INFO: "/api/download/info/<uuid>",
  DOWNLOAD_ENTIRE: "/api/download/raw/<uuid>",
  DOWNLOAD_PART: "/api/download/part/<uuid>/<part_number>",
};

export const moduleRoutes: { [key: string]: string } = {};

export function getRoute(route: keyof typeof routes) {
  return `${BASE_URL}${routes[route]}`;
}

export function getModuleRoute(route: string): string | undefined {
  return `${BASE_URL}${moduleRoutes[route]}`;
}
