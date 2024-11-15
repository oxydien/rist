export const BASE_URL = "http://127.0.0.1:3003";

export const routes = {
  AUTHORIZATION: "/api/authorize",
  SERVER_INFO: "/api/info",
};

export const moduleRoutes: { [key: string]: string } = {};

export function getRoute(route: keyof typeof routes) {
  return `${BASE_URL}${routes[route]}`;
}

export function getModuleRoute(route: string): string | undefined {
  return `${BASE_URL}${moduleRoutes[route]}`;
}
