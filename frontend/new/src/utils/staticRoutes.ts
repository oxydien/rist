export const BASE_URL = "";

export const routes = {
  AUTHORIZATION: '/api/authorize',
  SERVER_INFO: '/api/info',
};

export function getRoute(route: keyof typeof routes) {
  return `${BASE_URL}${routes[route]}`;
}
