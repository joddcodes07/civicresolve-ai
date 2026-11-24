/**
 * DesktopAttachmentZone — Milestone 29
 *
 * A drag-and-drop / file-picker zone that uses the native Electron attachment
 * manager (window.desktop.attachments) when running inside the desktop app.
 *
 * In the browser/web build it falls back to a standard <input type="file">.
 *
 * Props:
 *   sessionId  {string}   – Unique key for grouping this form's attachments
 *   onChange   {function} – Called with the updated attachment list whenever it changes
 *   maxFiles   {number}   – Maximum files allowed (default: 5)
 *   disabled   {boolean}  – Disables interaction
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const IS_DESKTOP = typeof window !== 'undefined' && !!window?.desktop?.attachments;

// File-type icon helper (simple extension → emoji)
function fileIcon(ext) {
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'].includes(ext)) return '🖼️';
  if (ext === '.pdf') return '📄';
  if (['.doc', '.docx'].includes(ext)) return '📝';
  if (['.xls', '.xlsx'].includes(ext)) return '📊';
  if (['.mp4', '.mov', '.avi'].includes(ext)) return '🎬';
  return '📎';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DesktopAttachmentZone({
  sessionId = 'lodge-draft',
  onChange,
  maxFiles = 5,
  disabled = false,
}) {
  const [attachments, setAttachments]   = useState([]);
  const [dragging, setDragging]         = useState(false);
  const [constraints, setConstraints]   = useState(null);
  const [busy, setBusy]                 = useState(false);
  const [error, setError]               = useState('');
  const fileInputRef                    = useRef(null);
  const dragCounter                     = useRef(0);

  // ── Load constraints & existing attachments on mount ──────────────────────
  useEffect(() => {
    if (!IS_DESKTOP) return;
    (async () => {
      const c    = await window.desktop.attachments.constraints();
      const list = await window.desktop.attachments.list(sessionId);
      setConstraints(c);
      setAttachments(list);
      onChange?.(list);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Save a file and refresh list ──────────────────────────────────────────
  const saveFile = useCallback(async (srcPath, mimeType = '') => {
    if (attachments.length >= maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await window.desktop.attachments.save(srcPath, mimeType, sessionId);
      if (!res.success) {
        setError(res.error || 'Could not save file.');
        return;
      }
      const updated = await window.desktop.attachments.list(sessionId);
      setAttachments(updated);
      onChange?.(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [attachments.length, maxFiles, sessionId, onChange]);

  // ── Remove ────────────────────────────────────────────────────────────────
  const remove = useCallback(async (id) => {
    if (!IS_DESKTOP) return;
    setBusy(true);
    try {
      await window.desktop.attachments.remove(id);
      const updated = await window.desktop.attachments.list(sessionId);
      setAttachments(updated);
      onChange?.(updated);
    } finally {
      setBusy(false);
    }
  }, [sessionId, onChange]);

  // ── Open in native viewer ─────────────────────────────────────────────────
  const openNative = useCallback(async (id) => {
    if (!IS_DESKTOP) return;
    await window.desktop.attachments.open(id);
  }, []);

  // ── Drag events ───────────────────────────────────────────────────────────
  const onDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };
  const onDragOver  = (e) => { e.preventDefault(); };

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (disabled || busy) return;

    if (IS_DESKTOP) {
      // In Electron the file path is available via the File object
      const files = Array.from(e.dataTransfer.files);
      for (const file of files.slice(0, maxFiles)) {
        // Electron exposes the absolute path as file.path
        if (file.path) {
          await saveFile(file.path, file.type);
        }
      }
    } else {
      // Web fallback: use File objects directly (handled by parent via onChange)
      const files = Array.from(e.dataTransfer.files);
      onChange?.(files);
    }
  }, [disabled, busy, maxFiles, saveFile, onChange]);

  // ── File input (dialog fallback or web) ───────────────────────────────────
  const onInputChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (IS_DESKTOP) {
      for (const file of files.slice(0, maxFiles)) {
        if (file.path) await saveFile(file.path, file.type);
      }
    } else {
      onChange?.(files);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [maxFiles, saveFile, onChange]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={[
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          dragging
            ? 'border-saffron bg-saffron/5 text-saffron'
            : 'border-line bg-surface text-ink-soft hover:border-ink-faint',
          disabled || busy ? 'pointer-events-none opacity-50' : 'cursor-pointer',
        ].join(' ')}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => !disabled && !busy && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Attach evidence files"
      >
        <span className="text-2xl">{dragging ? '📂' : '📎'}</span>
        <p className="text-sm font-medium">
          {dragging ? 'Drop to attach' : 'Drag & drop evidence files here'}
        </p>
        <p className="text-xs text-ink-faint">
          or{' '}
          <span className="underline underline-offset-2">browse files</span>
          {constraints
            ? ` — up to ${constraints.maxFileSizeMB} MB each`
            : ''}
        </p>
        {busy && (
          <span className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-saffron border-t-transparent" />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        accept={constraints?.allowedExtensions?.join(',') ?? 'image/*,.pdf,.doc,.docx'}
        onChange={onInputChange}
        aria-hidden
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500" role="alert">{error}</p>
      )}

      {/* Attachment list */}
      {IS_DESKTOP && attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <span className="shrink-0 text-lg">{fileIcon(att.ext)}</span>
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-ink hover:text-saffron hover:underline"
                onClick={() => openNative(att.id)}
                title={`Open ${att.name}`}
              >
                {att.name}
              </button>
              <span className="shrink-0 text-xs text-ink-faint">
                {formatBytes(att.size)}
              </span>
              <button
                type="button"
                className="shrink-0 text-ink-faint hover:text-red-500 transition-colors"
                onClick={() => remove(att.id)}
                aria-label={`Remove ${att.name}`}
                disabled={busy}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Slot count */}
      {IS_DESKTOP && (
        <p className="text-right text-xs text-ink-faint">
          {attachments.length} / {maxFiles} files
        </p>
      )}
    </div>
  );
}
