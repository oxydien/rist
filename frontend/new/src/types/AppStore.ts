export default interface AppStore {
  token: string;
  role: number;
  updateToken: (token: string) => void
  updateRole: (role: number) => void
}