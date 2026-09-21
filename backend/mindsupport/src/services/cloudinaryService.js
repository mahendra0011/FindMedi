import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_URL, CLOUDINARY_FOLDER } from "../config/env.js";

// Phase 10 (merge): shared credentials. In the merged server, backend/.env
// provides CLOUDINARY_URL (same variable name as the main
// src/services/cloudinaryService.js), so both stacks use one Cloudinary
// account. Only the folder differs ("mindsupport/..." vs main folders).

// Configure from URL
const cloudinaryMatches = CLOUDINARY_URL ? CLOUDINARY_URL.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/) : null;
if (cloudinaryMatches) {
  cloudinary.config({
    cloud_name: cloudinaryMatches[3],
    api_key: cloudinaryMatches[1],
    api_secret: cloudinaryMatches[2],
  });
}

const folderName = CLOUDINARY_FOLDER || "mindsupport";

/**
 * Upload an image buffer or base64 to Cloudinary.
 * @param {string} imageData - Base64 data URI or local file path
 * @param {Object} options
 * @param {string} [options.folder] - Subfolder within mindsupport
 * @param {string} [options.publicId] - Optional public ID
 * @returns {Promise<{url: string, publicId: string, secureUrl: string}>}
 */
export async function uploadToCloudinary(imageData, options = {}) {
  if (!CLOUDINARY_URL || !cloudinaryMatches) {
    console.warn("[cloudinary] CLOUDINARY_URL not configured or invalid. Skipping upload.");
    return { url: "", publicId: "", secureUrl: "" };
  }

  const subfolder = options.folder || "general";
  const publicId = options.publicId || `${folderName}/${subfolder}/${Date.now()}`;

  const result = await cloudinary.uploader.upload(imageData, {
    folder: `${folderName}/${subfolder}`,
    public_id: publicId,
    resource_type: "image",
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto", fetch_format: "auto" },
    ],
  });

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}

/**
 * Delete an image from Cloudinary by public ID.
 */
export async function deleteFromCloudinary(publicId) {
  if (!CLOUDINARY_URL || !publicId) return;
  return cloudinary.uploader.destroy(publicId);
}

/**
 * Generate a signed upload URL for client-side direct upload.
 */
export function generateUploadSignature() {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: folderName },
    cloudinary.config().api_secret
  );
  return {
    timestamp,
    signature,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
    folder: folderName,
  };
}