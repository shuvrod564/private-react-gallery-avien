import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Link2,
  Download,
  Calendar,
  Eye,
  Tag,
  FolderTree,
  User,
  BookOpen,
  ImageOff,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getImageBySlug, getRelatedImages, getAdjacentImages, recordImageView } from '../services/imageService';
import { cloudinaryUrl, cloudinaryOriginal } from '../lib/cloudinary';
import { ErrorState, ConfigMissing } from '../components/ui/Feedback';
import { formatDate, formatNumber, formatFileSize } from '../utils/format';
import { isSupabaseConfigured } from '../lib/env';
import { useToast } from '../contexts/ToastContext';

export default function ImageDetails() {
  const { slug } = useParams();
  const toast = useToast();

  const [image, setImage] = useState(null);
  const [related, setRelated] = useState([]);
  const [adjacent, setAdjacent] = useState({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(image?.title || '', {
    description: image?.description || image?.caption || image?.alt_text || '',
    canonicalPath: `/image/${slug}`,
    image: image?.cloudinary_public_id ? cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 1200 }) : undefined,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setImage(null);

    getImageBySlug(slug)
      .then(async (img) => {
        if (!active) return;
        if (!img) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setImage(img);
        // One view per session (spec §23).
        recordImageView(img.id).catch(() => {});
        const [rel, adj] = await Promise.all([
          getRelatedImages(img),
          getAdjacentImages(img),
        ]);
        if (!active) return;
        setRelated(rel);
        setAdjacent(adj);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug]);

  async function share() {
    const url = `${window.location.origin}/image/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: image.title, text: image.description || image.title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.error('Could not copy link.');
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ConfigMissing message="Connect Supabase and Cloudinary (see README.md) to view image details." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="skeleton aspect-[16/10] rounded-2xl" />
        <div className="mt-6 space-y-3">
          <div className="skeleton h-8 w-1/3" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <ImageOff className="h-12 w-12 text-stone-300" aria-hidden />
          <h1 className="font-display text-2xl font-semibold">Image not found</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            This image may have been unpublished or removed. <Link to="/gallery" className="text-brand-600 hover:underline">Back to gallery</Link>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!image) return null;

  const downloadable = image.allow_download && image.cloudinary_public_id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Prev / next nav */}
      <div className="mb-6 flex items-center justify-between text-sm">
        {adjacent.prev ? (
          <Link to={`/image/${adjacent.prev.slug}`} className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 dark:hover:text-white">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
          </Link>
        ) : <span />}
        <Link to="/gallery" className="text-stone-500 hover:text-stone-900 dark:hover:text-white">Back to gallery</Link>
        {adjacent.next ? (
          <Link to={`/image/${adjacent.next.slug}`} className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 dark:hover:text-white">
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : <span />}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main image */}
        <figure className="overflow-hidden rounded-2xl bg-stone-200 dark:bg-stone-800">
          <img
            src={cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 1600, crop: 'fit' })}
            alt={image.alt_text || image.title || ''}
            className="w-full"
          />
        </figure>

        {/* Meta sidebar */}
        <aside className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-display text-2xl font-semibold leading-snug">{image.title}</h1>
            </div>
            {image.caption && <p className="mt-2 text-sm italic text-stone-500 dark:text-stone-400">{image.caption}</p>}
          </div>

          {image.description && (
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{image.description}</p>
          )}

          <dl className="space-y-3 text-sm">
            {image.category && (
              <div className="flex items-center gap-2.5">
                <FolderTree className="h-4 w-4 text-stone-400" aria-hidden />
                <dt className="sr-only">Category</dt>
                <dd>
                  <Link to={`/category/${image.category.slug}`} className="text-brand-600 hover:underline dark:text-brand-400">
                    {image.category.name}
                  </Link>
                </dd>
              </div>
            )}
            {image.author && (
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-stone-400" aria-hidden />
                <dt className="sr-only">Author</dt>
                <dd>
                  <Link to={`/author/${image.author.slug}`} className="hover:underline">
                    {image.author.name}
                  </Link>
                </dd>
              </div>
            )}
            {image.album && (
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-stone-400" aria-hidden />
                <dt className="sr-only">Album</dt>
                <dd>
                  <Link to={`/album/${image.album.slug}`} className="hover:underline">
                    {image.album.name}
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-stone-400" aria-hidden />
              <dt className="sr-only">Uploaded</dt>
              <dd>{formatDate(image.created_at)}</dd>
            </div>
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-stone-400" aria-hidden />
              <dt className="sr-only">Views</dt>
              <dd>{formatNumber(image.view_count)} views</dd>
            </div>
            {image.file_size && (
              <div className="flex items-center gap-2.5">
                <span className="text-stone-400" aria-hidden>💾</span>
                <dd>{formatFileSize(image.file_size)} · {image.width}×{image.height} · {image.format?.toUpperCase()}</dd>
              </div>
            )}
          </dl>

          {image.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {image.tags.map((t) => (
                <Link
                  key={t.id}
                  to={`/tag/${t.slug}`}
                  className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-brand-100 hover:text-brand-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  <Tag className="h-3 w-3" aria-hidden /> {t.name}
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-4 dark:border-stone-800">
            <button
              type="button"
              onClick={share}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-medium hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
            >
              <Share2 className="h-4 w-4" aria-hidden /> Share
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/image/${image.slug}`);
                  toast.success('Link copied.');
                } catch {
                  toast.error('Could not copy link.');
                }
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-medium hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
            >
              <Link2 className="h-4 w-4" aria-hidden /> Copy link
            </button>
            {downloadable && (
              <a
                href={cloudinaryOriginal(image.cloudinary_public_id)}
                download={image.slug}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-medium hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </a>
            )}
          </div>
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 font-display text-xl font-semibold">Related images</h2>
          <ImageGrid images={related} />
        </section>
      )}
    </div>
  );
}
