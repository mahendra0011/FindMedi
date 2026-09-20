import { FileText, Paperclip, X } from "lucide-react";
import { formatChatAttachmentSize, isChatImageAttachment, isChatPdfAttachment } from "@/lib/chatAttachments";

export function MessageAttachment({ attachment, sent = false }) {
  if (!attachment?.fileUrl) return null;

  const label = attachment.fileName || (isChatPdfAttachment(attachment) ? "PDF attachment" : "Open attachment");

  if (isChatImageAttachment(attachment)) {
    return (
      <a href={attachment.fileUrl} target="_blank" rel="noreferrer" download={attachment.fileName || undefined} className="group relative mt-2 block overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 shadow-sm transition-all duration-200 hover:shadow-md hover:border-white/10">
        <img src={attachment.fileUrl} alt={label} className="max-h-64 w-full object-cover transition-all duration-300 group-hover:scale-[1.02]" />
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8`}>
          <span className={`block truncate text-xs font-medium ${sent ? "text-emerald-50" : "text-slate-200"} drop-shadow-sm`}>{label}</span>
        </div>
      </a>
    );
  }

  return (
    <a
      className={`mt-2 inline-flex max-w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3.5 py-2.5 text-xs no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.08] hover:border-white/10 hover:shadow-md ${
        sent ? "text-emerald-100" : "text-emerald-200"
      }`}
      href={attachment.fileUrl}
      target="_blank"
      rel="noreferrer"
      download={attachment.fileName || undefined}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 shadow-sm">
        {isChatPdfAttachment(attachment) ? <FileText className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        <span className="mt-0.5 block text-[10px] opacity-60">{isChatPdfAttachment(attachment) ? "PDF Document" : "Attachment"}</span>
      </span>
    </a>
  );
}

export function ComposerAttachmentPreview({ attachment, onRemove }) {
  if (!attachment?.fileUrl) return null;

  const label = attachment.fileName || "Attachment";
  const meta = [attachment.fileType || (isChatPdfAttachment(attachment) ? "PDF" : "File"), formatChatAttachmentSize(attachment.fileSize)].filter(Boolean).join(" - ");

  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-emerald-500/5 to-transparent p-2 text-slate-100 shadow-sm backdrop-blur-sm">
      {isChatImageAttachment(attachment) ? (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] shadow-sm">
          <img src={attachment.fileUrl} alt={label} className="h-full w-full object-cover" />
        </div>
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-rose-500/15 to-rose-600/10 text-rose-200 shadow-sm">
          <FileText className="h-6 w-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-200">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{meta}</span>
      </span>
      <button type="button" onClick={onRemove} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/10 hover:text-white hover:shadow-sm" aria-label="Remove attachment">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
