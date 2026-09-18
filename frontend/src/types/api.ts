/**
 * Shared API response types used across the Next.js frontend.
 * These wrap the Express backend's JSON responses.
 */

/** Base API response shape for successful requests. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

/** Paginated response with cursor/limit metadata. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Pagination metadata returned by the backend. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** A Mongoose document with standard fields. */
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** Generic filter / search parameters. */
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  facilityId?: string;
  hospitalId?: string;
  [key: string]: unknown;
}

/** Error response from the API. */
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

/** Authentication tokens returned by login / OTP endpoints. */
export interface AuthTokens {
  token: string;
  refreshToken: string;
}

/** Result of an API call that can either succeed or fail. */
export type ApiResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
