"use client";

import { useCallback, useMemo, useState } from "react";
type UploadResponse = {
  filename: string;
  path: string;
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "csv",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/csv",
  "application/vnd.ms-excel",
]);

function getExtension(filename: string | undefined | null): string | null {
  if (!filename) return null;
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return null;
  return filename.slice(idx + 1).toLowerCase();
}

function humanFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export default function FileUploadInput({
  value,
  onChange,
  theme,
}: {
  value?: UploadResponse | null;
  onChange: (v: UploadResponse | null) => void;
  theme: { accent: string; text: string; muted: string; border: string };
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFilename = value?.filename;

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_SIZE_BYTES) {
        setError(`File is too large. Max is 10MB (got ${humanFileSize(file.size)}).`);
        return;
      }

      const ext = getExtension(file.name);
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        setError(`Unsupported file type. Allowed: pdf, doc, docx, jpg, png, csv.`);
        return;
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        setError(`Unsupported file type. Allowed: pdf, doc, docx, jpg, png, csv.`);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      setUploading(true);
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || "Upload failed.");
          return;
        }

        const data = (await res.json()) as UploadResponse;
        if (!data?.filename || !data?.path) {
          setError("Upload failed (invalid response).");
          return;
        }

        onChange(data);
      } catch {
        setError("Network error while uploading.");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      // Allow selecting the same file again.
      e.target.value = "";
    },
    [upload]
  );

  const zoneStyle = useMemo(() => {
    const base: React.CSSProperties = {
      border: `1px dashed ${theme.border}`,
      background: "transparent",
      color: theme.text,
      borderRadius: 12,
      padding: 16,
      textAlign: "center",
      transition: "all 0.15s",
      cursor: uploading ? "not-allowed" : "pointer",
    };
    if (dragActive) {
      base.border = `1px dashed ${theme.accent}`;
      base.boxShadow = `0 0 0 1px ${theme.accent}33`;
    }
    return base;
  }, [dragActive, theme, uploading]);

  return (
    <div>
      <div
        style={zoneStyle}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!uploading) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => {
          if (uploading) return;
          const input = document.getElementById("tideform-upload-input") as HTMLInputElement | null;
          input?.click();
        }}
      >
        <input
          id="tideform-upload-input"
          type="file"
          onChange={onFileInput}
          style={{ display: "none" }}
          disabled={uploading}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>{uploading ? "⟳" : "⬆"}</div>
          <div style={{ fontSize: 12, color: theme.muted }}>
            Drag & drop or click to upload (max 10MB)
          </div>
          <div style={{ fontSize: 11, color: theme.muted }}>
            Allowed: pdf, doc, docx, jpg, png, csv
          </div>
        </div>
      </div>

      {selectedFilename && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 12, color: theme.text, marginBottom: 8, wordBreak: "break-word" }}>
            Selected: {selectedFilename}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.muted,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Remove file
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>
          {error}
        </div>
      )}
    </div>
  );
}

