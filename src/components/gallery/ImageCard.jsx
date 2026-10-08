import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { cloudinaryUrl, cloudinaryBlur } from '../../lib/cloudinary';
import { formatNumber } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { usePoster } from '../../contexts/PosterContext';

/**
 * Pinterest-style image card with responsive aspect ratio,
 * hover overlay showing captions and actions, and clean presentation.
 */
export function ImageCard({ image, onOpen }) {
  const { isAdmin } = useAuth();
  const { showPoster } = usePoster();

  // Natural aspect ratio as percentage padding
  const paddingTop = useMemo(() => {
    if (image.width && image.height) {
      // Clamp between portrait (200%) and landscape (50%) to keep cards reasonable
      return `${Math.max(50, Math.min(200, (image.height / image.width) * 100))}%`;
    }
    return '100%';
  }, [image.width, image.height]);

  const cardContent = (
    <figure className="group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      {/* Image with aspect ratio container */}
      <div className="relative w-full overflow-hidden" style={{ paddingTop }}>
        {/* Blur-up placeholder */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${cloudinaryBlur(image.cloudinary_public_id)}")` }}
        />

        {/* Actual image */}
        <img
          src={cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 600 })}
          srcSet={`
            ${cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 400 })} 400w,
            ${cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 600 })} 600w,
            ${cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 900 })} 900w
          `}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={image.alt_text || image.title || ''}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
            showPoster ? 'blur-md scale-110' : 'blur-0 scale-100'
          }`}
          onError={(e) => {
            e.currentTarget.style.backgroundImage = 'none';
            e.currentTarget.src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e7e5e4"/></svg>';
          }}
        />

        {/* Hover overlay — contains admin badge & captions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5 z-10">
          {/* Top-right actions */}
          <div className="flex justify-end items-center gap-2 opacity-0 translate-y-[-8px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            {isAdmin && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${
                  image.is_published ? 'bg-emerald-500/90 text-white' : 'bg-stone-500/90 text-white'
                }`}
              >
                {image.is_published ? 'Published' : 'Draft'}
              </span>
            )}
          </div>

          {/* Bottom Caption Overlay */}
          <div className="opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <h3 className="text-sm font-medium text-white line-clamp-1 leading-snug drop-shadow-sm">
              {image.title}
            </h3>

            {(image.author?.name || image.category?.name) && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-200 drop-shadow-sm">
                {image.author?.name && (
                  <>
                    <span className="truncate">{image.author.name}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                {image.category?.name && (
                  <span className="truncate">{image.category.name}</span>
                )}
              </div>
            )}

            {image.caption && (
              <p className="mt-1.5 text-xs text-stone-300 line-clamp-2 leading-relaxed drop-shadow-sm">
                {image.caption}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between">
              {/* Tags */}
              {image.tags?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {image.tags.slice(0, 2).map((t) => (
                    <span
                      key={t.id}
                      className="inline-block rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white"
                    >
                      {t.name}
                    </span>
                  ))}
                  {image.tags.length > 2 && (
                    <span className="text-[10px] text-stone-300 backdrop-blur-md bg-white/10 rounded-full px-1.5 py-0.5">
                      +{image.tags.length - 2}
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* View Count */}
              <div className="flex items-center gap-1 shrink-0 text-stone-200">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                <span className="text-xs font-medium">{formatNumber(image.view_count)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(image)} className="block w-full text-left">
        {cardContent}
      </button>
    );
  }
  return <Link to={`/image/${image.slug}`}>{cardContent}</Link>;
}