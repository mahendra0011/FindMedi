import { uploadToCloudinary, generateUploadSignature } from "../services/cloudinaryService.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateImageUpload(image) {
  if (!image || typeof image !== "string") {
    return "No image data provided";
  }
  // Check size from base64 length (~0.75 ratio)
  const sizeBytes = Math.ceil((image.length * 3) / 4);
  if (sizeBytes > MAX_FILE_SIZE) {
    return "Image exceeds 5MB limit";
  }
  // Check mime type from data URI
  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  if (!mimeMatch) {
    return "Invalid image format. Use JPEG, PNG, WebP, or GIF.";
  }
  if (!ALLOWED_IMAGE_TYPES.includes(mimeMatch[1])) {
    return `Unsupported image type: ${mimeMatch[1]}. Allowed: JPEG, PNG, WebP, GIF.`;
  }
  return null;
}

export function registerUploadRoutes(app, context) {
  const { asyncRoute, authRequired } = context;

  // Get upload signature for client-side direct upload
  app.get(
    "/api/upload/signature",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const signature = generateUploadSignature();
      res.json(signature);
    })
  );

  // Upload image via backend proxy
  app.post(
    "/api/upload/image",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const { image, folder } = req.body || {};
      const error = validateImageUpload(image);
      if (error) {
        res.status(400).json({ error });
        return;
      }
      const result = await uploadToCloudinary(image, { folder: folder || "profiles" });
      res.json(result);
    })
  );
}