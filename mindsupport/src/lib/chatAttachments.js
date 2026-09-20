export const CHAT_ATTACHMENT_ACCEPT = "image/*,application/pdf";
export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const allowedAttachmentTypes = new Set(["application/pdf"]);

export function isAllowedChatAttachment(file) {
  return Boolean(file?.type?.startsWith("image/") || allowedAttachmentTypes.has(file?.type));
}

export function formatChatAttachmentSize(bytes = 0) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isChatImageAttachment(attachment = {}) {
  return Boolean(attachment.fileType?.startsWith("image/") || attachment.fileUrl?.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|avif)([?#].*)?$/i.test(attachment.fileUrl || ""));
}

export function isChatPdfAttachment(attachment = {}) {
  return Boolean(attachment.fileType === "application/pdf" || attachment.fileUrl?.startsWith("data:application/pdf") || /\.pdf([?#].*)?$/i.test(attachment.fileUrl || ""));
}

export function readChatAttachment(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (!isAllowedChatAttachment(file)) {
      reject(new Error("Only image files and PDFs can be attached."));
      return;
    }
    if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
      reject(new Error("Attachment must be 5 MB or smaller."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileName: file.name || "Attachment",
        fileType: file.type || "",
        fileSize: file.size || 0,
        fileUrl: String(reader.result || ""),
      });
    };
    reader.onerror = () => reject(new Error("Could not read this attachment."));
    reader.readAsDataURL(file);
  });
}
