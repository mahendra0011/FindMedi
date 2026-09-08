export { request, downloadFile, apiClient, setAuthTokens, clearAuthTokens, refreshAccessToken } from './client';
export { api } from './endpoints';
export * from './endpoints';
// Re-export auth types from the API barrel so slices can import from '@/lib/api'
export type { AuthResponse, LoginCredentials, RegisterPayload } from '@/types/models/user';
