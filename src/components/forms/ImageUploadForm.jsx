import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ImagePlus,
} from "lucide-react";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { createImage } from "../../services/imageService";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "../../utils/constants";
import { formatFileSize } from "../../utils/format";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { TagInput } from "./TagInput";
import { useToast } from "../../contexts/ToastContext";
import { usePoster } from "../../contexts/PosterContext";

const STATUS_LABEL = {
  ready: "Ready",
  uploading: "Uploading…",
  processing: "Saving metadata…",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/**
 * Multi-image upload with per-image metadata (spec §37, §38).
 * Order: validate file → signed upload to Cloudinary → validate metadata →
 * save to Supabase → success. A failed image never blocks the others.
 */
export function ImageUploadForm({
  categories,
  tags,
  authors,
  albums,
  onUploaded,
}) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showPoster, togglePoster } = usePoster();

  const defaultMeta = (name) => ({
    title: name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim(),
    description: "",
    caption: "",
    alt_text: "",
    category_id: "",
    author_id: "",
    album_id: "",
    tags: [],
    is_featured: false,
    is_published: true,
    allow_download: false,
    sort_order: 0,
  });

  const acceptFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList ?? []);
      const errors = [];
      const next = [];

      for (const file of incoming) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          errors.push(
            `${file.name}: unsupported file type (JPEG, PNG, WebP, AVIF, GIF only).`,
          );
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          errors.push(
            `${file.name}: exceeds the ${formatFileSize(MAX_UPLOAD_BYTES)} limit.`,
          );
          continue;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: "ready",
          error: null,
          meta: defaultMeta(file.name),
          asset: null,
        });
      }
      if (errors.length) toast.error(errors.join(" "));
      if (next.length) setItems((prev) => [...prev, ...next]);
    },
    [toast],
  );

  const updateMeta = (id, patch) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, meta: { ...it.meta, ...patch } } : it,
      ),
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  async function uploadItem(item) {
    try {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "uploading", error: null } : it,
        ),
      );

      // 1. Signed upload to Cloudinary
      const asset = await uploadToCloudinary(item.file, {
        folder: "personal-gallery",
      });

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "processing", asset } : it,
        ),
      );

      // 2. Validate + save metadata to Supabase
      const { meta } = item;
      if (!meta.title.trim() || meta.title.trim().length < 2) {
        throw new Error(
          `"${item.file.name}": a title of at least 2 characters is required.`,
        );
      }
      if (!meta.category_id) {
        throw new Error(`"${item.file.name}": a category is required.`);
      }

      await createImage({
        ...asset,
        title: meta.title.trim(),
        description: meta.description,
        caption: meta.caption,
        alt_text: meta.alt_text,
        category_id: meta.category_id,
        author_id: meta.author_id || null,
        album_id: meta.album_id || null,
        tags: meta.tags
          .map((t) => (t.id.startsWith("new-") ? null : t.id))
          .filter(Boolean),
        is_featured: meta.is_featured,
        is_published: meta.is_published,
        allow_download: meta.allow_download,
        sort_order: meta.sort_order,
      });

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "completed" } : it,
        ),
      );
      return true;
    } catch (err) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: "failed",
                error:
                  err?.message || "Something went wrong. Please try again.",
              }
            : it,
        ),
      );
      return false;
    }
  }

  async function uploadAll() {
    setUploading(true);
    let ok = 0;
    let failed = 0;
    const ready = items.filter((it) => it.status === "ready");
    for (const item of ready) {
      const success = await uploadItem(item);
      if (success) ok += 1;
      else failed += 1;
    }
    setUploading(false);
    if (failed > 0)
      toast.error(
        `${failed} image(s) failed. Successful uploads were still saved.`,
      );
    else if (ok > 0) toast.success(`${ok} image(s) uploaded successfully.`);
    if (ok > 0) onUploaded?.();

    // Auto-reload: if all succeeded with no failures, clear the form
    // after a brief delay so the user sees "Completed" before it resets.
    if (ok > 0 && failed === 0) {
      setTimeout(() => {
        setItems((current) => {
          // Release preview object URLs to prevent memory leaks
          current.forEach((it) => {
            if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
          });
          return [];
        });
      }, 3500);
    }
  }

  const readyCount = items.filter((it) => it.status === "ready").length;
  const completedCount = items.filter((it) => it.status === "completed").length;
  const failedCount = items.filter((it) => it.status === "failed").length;
  const inProgress = items.some(
    (it) => it.status === "uploading" || it.status === "processing",
  );
  const allDone =
    items.length > 0 && !inProgress && readyCount + failedCount === 0;

  return (
    <div className="space-y-6">
      {/* Empty categories guidance */}
      {categories.length === 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>No categories yet.</strong> A category is required to upload
            images.{" "}
            <Link
              to="/admin/categories"
              className="font-medium underline hover:no-underline"
            >
              Create a category first
            </Link>{" "}
            in the Categories manager, then come back here to upload.
          </p>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          acceptFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Upload images"
        className={`flex cursor-pointer flex-col items-center justify-center md:gap-3 rounded-2xl border-2 border-dashed px-3 md:px-5 py-5 md:py-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          dragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
            : "border-stone-300 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600"
        }`}
      >
        <UploadCloud
          className={`size-8 md:size-10 ${dragOver ? "text-brand-500" : "text-stone-400"}`}
          aria-hidden
        />
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-100 text-sm md:text-base">
            Drag &amp; drop images here, or click to browse
          </p>
          <p className="mt-1 text-xs md:text-sm text-stone-500 dark:text-stone-400">
            JPEG, PNG, WebP, AVIF, GIF · up to{" "}
            {formatFileSize(MAX_UPLOAD_BYTES)} each · multiple files supported
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            acceptFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Item cards */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <div
                  onClick={() => togglePoster?.()}
                  className="relative size-20 md:size-28 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800"
                  title="Click image preview to toggle blur"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.meta.title || "Preview"}
                      className={`h-full w-full object-cover transition-all duration-300 ${
                        showPoster ? "blur-md scale-110" : "blur-0 scale-100"
                      }`}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <ImagePlus
                        className="h-8 w-8 text-stone-300"
                        aria-hidden
                      />
                    </div>
                  )}
                  <span
                    className={`absolute bottom-1 left-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${
                      item.status === "completed"
                        ? "bg-emerald-500"
                        : item.status === "failed"
                          ? "bg-red-500"
                          : item.status === "uploading" ||
                              item.status === "processing"
                            ? "bg-brand-500"
                            : "bg-stone-500"
                    }`}
                  >
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : null}
                    {item.status === "uploading" ||
                    item.status === "processing" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    {item.status === "failed" ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : null}
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>

                <div className="grid flex-1 gap-3 grid-cols-2">
                  <div className="col-span-2">
                    <Field label="Title" htmlFor={`title-${item.id}`} required>
                      <Input
                        id={`title-${item.id}`}
                        value={item.meta.title}
                        disabled={item.status === "completed"}
                        onChange={(e) =>
                          updateMeta(item.id, { title: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Category" htmlFor={`cat-${item.id}`} required>
                    <Select
                      id={`cat-${item.id}`}
                      value={item.meta.category_id}
                      disabled={item.status === "completed"}
                      onChange={(e) =>
                        updateMeta(item.id, { category_id: e.target.value })
                      }
                    >
                      <option value="">Select…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Author" htmlFor={`auth-${item.id}`}>
                    <Select
                      id={`auth-${item.id}`}
                      value={item.meta.author_id}
                      disabled={item.status === "completed"}
                      onChange={(e) =>
                        updateMeta(item.id, { author_id: e.target.value })
                      }
                    >
                      <option value="">None</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Album" htmlFor={`alb-${item.id}`}>
                    <Select
                      id={`alb-${item.id}`}
                      value={item.meta.album_id}
                      disabled={item.status === "completed"}
                      onChange={(e) =>
                        updateMeta(item.id, { album_id: e.target.value })
                      }
                    >
                      <option value="">None</option>
                      {albums.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="md:col-span-2_">
                    <Field label="Tags">
                      <TagInput
                        value={item.meta.tags}
                        suggestions={tags}
                        onChange={(tags) => updateMeta(item.id, { tags })}
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Description">
                      <Textarea
                        rows={2}
                        value={item.meta.description}
                        disabled={item.status === "completed"}
                        onChange={(e) =>
                          updateMeta(item.id, { description: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Alt text">
                      <Input
                        value={item.meta.alt_text}
                        disabled={item.status === "completed"}
                        onChange={(e) =>
                          updateMeta(item.id, { alt_text: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
                    <Switch
                      checked={item.meta.is_published}
                      onChange={(v) => updateMeta(item.id, { is_published: v })}
                      label="Published"
                      disabled={item.status === "completed"}
                    />
                    Published
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
                    <Switch
                      checked={item.meta.is_featured}
                      onChange={(v) => updateMeta(item.id, { is_featured: v })}
                      label="Featured"
                      disabled={item.status === "completed"}
                    />
                    Featured
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={
                    item.status === "uploading" || item.status === "processing"
                  }
                  aria-label={`Remove ${item.meta.title || "image"}`}
                  className="h-8 w-8 shrink-0 self-start rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {item.status === "failed" && item.error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {item.error}
                </p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {readyCount} ready · {completedCount} completed · {failedCount}{" "}
              failed
            </p>

            {allDone ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ {completedCount} image{completedCount === 1 ? "" : "s"}{" "}
                  uploaded
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    // Release all preview object URLs before clearing
                    setItems((current) => {
                      current.forEach((it) => {
                        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
                      });
                      return [];
                    });
                    setUploading(false);
                  }}
                >
                  Upload more images
                </Button>
              </div>
            ) : (
              <Button
                onClick={uploadAll}
                loading={uploading}
                disabled={readyCount === 0 || inProgress}
                size="lg"
                className="fixed bottom-4 right-4 z-40 md:static"
              >
                {uploading
                  ? "Uploading…"
                  : `Upload ${readyCount} image${readyCount === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>

          {/* Auto-reload hint when all done */}
          {allDone && (
            <p className="text-center text-xs text-stone-400 dark:text-stone-500">
              Click "Upload more" to start a new batch, or drop new files into
              the area above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
