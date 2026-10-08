import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Link2 } from 'lucide-react';
import { cloudinaryUrl, cloudinaryOriginal } from '../../lib/cloudinary';
import { useToast } from '../../contexts/ToastContext';

/**
 * Accessible lightbox: keyboard nav (Esc/←/→), touch swipe, zoom,
 * optional download (spec §18, §58, §59).
 */
export function Lightbox({ images, index, onClose, onNavigate }) {
  const [zoomed, setZoomed] = useState(false);
  const touchRef = useRef(null);
  const toast = useToast();

  const image = images[index];
  const total = images.length;

  const prev = useCallback(() => onNavigate((index - 1 + total) % total), [index, total, onNavigate]);
  const next = useCallback(() => onNavigate((index + 1) % total), [index, total, onNavigate]);

  useEffect(() => {
    if (!image) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [image, onClose, prev, next]);

  useEffect(() => setZoomed(false), [index]);

  if (!image) return null;

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    touchRef.current = null;
  };

  const canDownload = Boolean(image.allow_download && image.cloudinary_public_id);

  async function copyLink() {
    const url = `${window.location.origin}/image/${image.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.error('Could not copy link.');
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={image.title}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="max-w-[60%] truncate text-sm font-medium text-white/80">{image.title}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={copyLink} aria-label="Copy link" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
            <Link2 className="h-5 w-5" />
          </button>
          {canDownload && (
            <a
              href={cloudinaryOriginal(image.cloudinary_public_id)}
              download={image.slug}
              aria-label="Download image"
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Download className="h-5 w-5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close lightbox" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 z-10 rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 z-10 rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20 sm:right-4"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <img
          key={image.id}
          src={cloudinaryUrl({ publicId: image.cloudinary_public_id, width: zoomed ? 1600 : 1200, crop: 'fit' })}
          alt={image.alt_text || image.title || ''}
          className={`max-h-full max-w-full object-contain transition-transform duration-300 ${
            zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setZoomed((z) => !z)}
        />
      </div>

      {/* Caption bar */}
      <div className="px-4 py-4 text-center">
        <p className="text-sm text-white/80">
          {image.caption || image.description || image.title}
          <span className="ml-2 text-white/40">
            {index + 1} / {total}
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
