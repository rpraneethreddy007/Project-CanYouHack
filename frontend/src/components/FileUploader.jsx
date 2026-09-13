// Reusable file-upload widget. Per ISSUES.md #17:
// "FileUploader.jsx — upload widget for their code file".
//
// Props:
//   accept      — file accept string (e.g. ".c,.cpp")
//   file        — currently selected File object (or null)
//   onChange    — called with the new File (or null if cleared)
//   disabled    — when true the widget is locked (post-deadline state)
//   label       — optional label string above the widget
//   hint        — optional sub-label string
//
// The widget handles both click-to-browse and drag-and-drop. The disabled
// state matches ISSUES.md #17's acceptance criterion: "attempting upload
// after the deadline shows a disabled state ... not a silent failure."
import { useRef, useState } from "react";

export default function FileUploader({ accept, file, onChange, disabled = false, label, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    if (disabled || !files || files.length === 0) return;
    onChange(files[0]);
  }

  function onDragOver(e) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }
  function onDragLeave() { setDragging(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {label && <p className="field-label">{label}</p>}

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={[
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-paper-line bg-paper opacity-60"
            : dragging
            ? "cursor-copy border-cobalt bg-cobalt-soft/30"
            : "cursor-pointer border-paper-line hover:border-ink-faint",
        ].join(" ")}
      >
        <UploadIcon disabled={disabled} />

        {file ? (
          <div className="space-y-1">
            <p className="font-mono text-[13px] font-medium text-ink">{file.name}</p>
            <p className="text-xs text-ink-soft">{formatBytes(file.size)}</p>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                className="text-xs text-brick hover:text-brick-dark font-medium"
              >
                Remove
              </button>
            )}
          </div>
        ) : disabled ? (
          <p className="text-sm font-medium text-ink-soft">Submission window closed</p>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">
              {dragging ? "Drop it here" : "Drag a file here or click to browse"}
            </p>
            {accept && (
              <p className="text-xs text-ink-faint">Accepted: {accept}</p>
            )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function UploadIcon({ disabled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="currentColor"
      className={`h-7 w-7 ${disabled ? "text-ink-faint" : "text-ink-soft"}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
