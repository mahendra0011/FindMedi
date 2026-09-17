import { type ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes, resolving conflicts. Ported from client/src/lib/utils.js */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string to a human-readable format. */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-IN', options);
}

/** Format a date string with time. */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format time (e.g. "10:30 AM"). */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Calculate relative time (e.g. "5 min ago"). */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day ago`;
  return formatDate(d);
}

/** Debounce a function call. */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/** Convert a File to a base64 string. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Validate email format. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate phone number (Indian format). */
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

/** Capitalize first letter. */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format a number as currency (INR). */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/** Get today's date as a YYYY-MM-DD string in IST (UTC+5:30). */
export function getISTDateString(date: Date = new Date()): string {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffsetMs);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}

/**
 * Format a YYYY-MM-DD string like "2027-10-27" into "27 Oct 2027".
 * Manually parsed to avoid JS Date timezone shifting the day.
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return dateStr;
  const [, m, d] = parts;
  const y = parts[0];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[m! - 1] || 'Jan'} ${y}`;
}

/** Resolve a file URL for display. */
export function resolveFileUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const origin = base.replace(/\/api\/?$/, '');
  if (url.startsWith('/')) return origin + url;
  return url;
}

/** Sleep for debugging / retrying. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a unique ID (client-side, non-crypto). */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Convert a params object (which may contain numbers, booleans, strings)
 * into a URLSearchParams-friendly Record<string, string>.
 * Filters out undefined/null values. Handles noUncheckedIndexedAccess.
 */
export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  return search.toString();
}

/**
 * Append query params to a URL path.
 * Usage: `withQuery('/appointments', { page: 2, limit: 10 })`
 */
export function withQuery(path: string, params: Record<string, unknown> = {}): string {
  const qs = toQueryString(params);
  if (!qs) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${qs}`;
}

/** True only when the value is an actual usable file URL. */
export function isValidFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:');
}

/** Detect file type from a URL or filename. Returns 'image' | 'pdf' | 'other'. */
export function getFileType(url: string = ''): 'image' | 'pdf' | 'other' {
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)) return 'image';
  if (/\.pdf$/i.test(url)) return 'pdf';
  return 'other';
}


/**
 * Resolve a file URL for inline preview.
 * Local /auth-protected URLs are fetched with credentials + Bearer token → blob URL.
 * External URLs (Cloudinary, etc.) are returned as-is.
 *
 * @param url - raw file URL stored on the appointment/record
 * @returns {url, type, rawUrl} | null
 */
export async function getFilePreviewUrl(
  url: string,
  getToken: () => string | null = () => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  },
): Promise<{ url: string; type: 'image' | 'pdf' | 'other'; rawUrl: string } | null> {
  const resolved = resolveFileUrl(url);
  if (!resolved) return null;

  let type: 'image' | 'pdf' | 'other' = getFileType(resolved);

  // If already a blob or data url, return directly
  if (resolved.startsWith('blob:') || resolved.startsWith('data:')) {
    return { url: resolved, type, rawUrl: resolved };
  }

  // External URLs (http/https) are publicly accessible
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return { url: resolved, type, rawUrl: resolved };
  }

  // Local /auth-protected URLs — fetch with credentials + Bearer token
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(resolved, {
      credentials: 'include',
      headers,
    });
    if (!response.ok) throw new Error(`Failed to load file (${response.status})`);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/pdf') || resolved.toLowerCase().endsWith('.pdf')) {
      type = 'pdf';
    } else if (contentType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(resolved)) {
      type = 'image';
    }

    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), type, rawUrl: resolved };
  } catch (err) {
    console.error('getFilePreviewUrl error:', err);
    return { url: resolved, type, rawUrl: resolved };
  }
}
