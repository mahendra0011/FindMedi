const SPECIAL_CHARS = /[<>"'&]/g;
const ENTITY_MAP = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "&": "&amp;" };

export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(SPECIAL_CHARS, (char) => ENTITY_MAP[char]);
}

export function sanitizeInput(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

export function stripHtml(str) {
  if (typeof str !== "string") return "";
  const doc = new DOMParser().parseFromString(str, "text/html");
  return doc.body.textContent || "";
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === "string" ? sanitizeInput(value) : value;
  }
  return sanitized;
}
