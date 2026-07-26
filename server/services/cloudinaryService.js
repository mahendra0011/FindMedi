import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let configured = false;

function ensureCloudinaryConfigured() {
  if (configured) return;

  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)$/.exec(url);
    if (m) {
      cloudinary.config({
        cloud_name: m[3],
        api_key: m[1],
        api_secret: m[2],
        secure: true,
      });
      configured = true;
      return;
    }
  }

  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
    return;
  }

  throw new Error(
    'Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
  );
}

/**
 * Upload file to Cloudinary (images as image, PDF and other files as raw).
 * @param {Buffer} fileBuffer
 * @param {string} filename
 * @param {string} mimeType
 * @param {string} folder
 */
export const uploadFileToCloudinary = async (
  fileBuffer,
  filename,
  mimeType,
  folder = 'medicore/uploads'
) => {
  ensureCloudinaryConfigured();

  const safeName = path.basename(filename).replace(/\s+/g, '_') || 'upload';
  const ext = path.extname(safeName);
  const base = ext ? safeName.slice(0, -ext.length) : safeName;
  const publicId = `${uuidv4()}-${base}${ext}`;

  const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        use_filename: false,
        overwrite: false,
      },
      (err, uploadResult) => {
        if (err) reject(err);
        else resolve(uploadResult);
      }
    );
    stream.end(fileBuffer);
  });

  return {
    id: result.public_id,
    url: result.secure_url,
    filename,
    publicId: result.public_id,
    fileId: result.public_id,
    format: result.format,
    size: result.bytes,
    mimeType,
    storedIn: 'cloudinary',
  };
};

export default cloudinary;
