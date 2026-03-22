import React, { useState, useRef, useCallback } from "react";
import { Upload, FileUp, Loader2, AlertCircle } from "lucide-react";

interface Props {
  onFileAccepted: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".pptx"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

function isValidFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME_TYPES.includes(file.type);
}

const FileUploadDropzone: React.FC<Props> = ({
  onFileAccepted,
  isUploading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      if (!isValidFile(file)) {
        setLocalError("Only .pdf and .pptx files are supported.");
        return;
      }
      onFileAccepted(file);
    },
    [onFileAccepted],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) setIsDragOver(true);
    },
    [isUploading],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (isUploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [isUploading, handleFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  const displayError = error || localError;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-4
        rounded-2xl border-2 border-dashed p-10 cursor-pointer
        transition-all duration-200 select-none
        ${isUploading ? "pointer-events-none opacity-60" : ""}
        ${isDragOver
          ? "border-indigo-400 bg-indigo-50/60 scale-[1.01]"
          : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-gray-50"
        }
      `}
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF or PPTX file"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.pptx"
        onChange={onInputChange}
        className="hidden"
        aria-hidden
      />

      {isUploading ? (
        <>
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-gray-500">
            Processing your file…
          </p>
        </>
      ) : (
        <>
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
              isDragOver ? "bg-indigo-100" : "bg-gray-100"
            }`}
          >
            {isDragOver ? (
              <FileUp className="h-7 w-7 text-indigo-500" />
            ) : (
              <Upload className="h-7 w-7 text-gray-400" />
            )}
          </span>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {isDragOver ? "Drop your file here" : "Drag & drop your presentation"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or click to browse · PDF or PPTX
            </p>
          </div>
        </>
      )}

      {displayError && (
        <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploadDropzone;
