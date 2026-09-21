import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const PORT = Number(process.env.MIND_PORT || 8089);
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindsupport";
function databaseFromMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] || "");
    return database || "";
  } catch {
    return "";
  }
}

export const MONGODB_DATABASE =
  process.env.MONGODB_DATABASE || process.env.MONGODB_DB_NAME || databaseFromMongoUri(MONGODB_URI) || "mindsupport";
export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  console.warn("[env] WARNING: Using insecure default JWT_SECRET for development");
  return "change-this-dev-secret";
})();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8080";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
export const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
export const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "mindsupport@example.com";
export const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "MindSupport";
export const NOTES_ENCRYPTION_KEY = process.env.NOTES_ENCRYPTION_KEY || "";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/api/auth/google/callback";
export const CLOUDINARY_URL = process.env.CLOUDINARY_URL || "";
export const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "mindsupport";
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
export const GOOGLE_MEET_DEFAULT_LINK = process.env.GOOGLE_MEET_DEFAULT_LINK || "https://meet.google.com/new";
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export function getMongoOptions(extra = {}) {
  return {
    ...extra,
    dbName: MONGODB_DATABASE,
  };
}

export function maskMongoUri(uri = MONGODB_URI) {
  return uri.replace(/\/\/.*@/, "//***@");
}
