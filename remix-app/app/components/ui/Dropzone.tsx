// Dropzone — client-only drag-and-drop file zone (Phase 5 ancestor)
// THREAT MODEL T-04.1-06: This component is UI-only in Phase 4.1.
// It calls onFile(File) to hand the selected file to the caller.
// It does NOT perform any fetch, upload, FormData submission, or server storage.
// Server-side validation/parsing is Phase 5 scope (LAB-01..03).

"use client";

import { useRef, useState } from "react";
import { Upload, FileJson } from "lucide-react";

export interface DropzoneProps {
  /** MIME types / extensions to accept. @default ".json,application/json" */
  accept?: string;
  /** Called with the selected File — no upload/storage in this phase */
  onFile: (file: File) => void;
  label?: string;
}

export function Dropzone({
  accept = ".json,application/json",
  onFile,
  label = "Drag and drop your file here",
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleFile(f: File | undefined): void {
    // Hand file to caller only — NO fetch/upload/FormData/storage (T-04.1-06)
    if (f) onFile(f);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      style={{
        border: `1.5px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`,
        background: drag ? "var(--focus-50)" : "var(--surface-2)",
        borderRadius: "var(--radius-lg)",
        padding: "44px 24px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all var(--dur-base) var(--ease-out)",
      }}
    >
      {/* Hidden file input — no server processing in this phase */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Icon chip */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "var(--radius-md)",
          background: drag ? "var(--focus-100)" : "var(--surface-sunken)",
          color: drag ? "var(--accent)" : "var(--text-muted)",
          marginBottom: 16,
        }}
      >
        {drag ? (
          <FileJson size={26} strokeWidth={1.8} />
        ) : (
          <Upload size={26} strokeWidth={1.8} />
        )}
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-md)",
          fontWeight: 500,
          color: "var(--text)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "var(--text-muted)",
          fontSize: "var(--text-sm)",
          margin: "6px 0 16px",
        }}
      >
        or
      </div>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 34,
          padding: "0 14px",
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          borderRadius: "var(--radius-pill)",
          background: "var(--surface)",
          border: "1.5px solid var(--border-strong)",
          color: "var(--text)",
          pointerEvents: "none",
        }}
      >
        Browse files
      </span>
    </div>
  );
}
