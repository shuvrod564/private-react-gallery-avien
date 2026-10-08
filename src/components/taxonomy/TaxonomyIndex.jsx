import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ImageOff } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cloudinaryUrl } from '../../lib/cloudinary';
import { formatNumber } from '../../utils/format';
import { isSupabaseConfigured } from '../../lib/env';
import { EmptyState, ErrorState, ConfigMissing, Spinner } from '../ui/Feedback';
import { usePoster } from '../../contexts/PosterContext';

/**
 * Generic index page for categories / tags / authors / albums.
 * Each shows a cover, name, description and published image count.
 */
export function TaxonomyIndex({ title, description, service, routePrefix, entityName, metaDescription }) {
  useDocumentTitle(title, { description: metaDescription });
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const { showPoster } = usePoster();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    service
      .listWithCounts()
      .then((rows) => active && setItems(rows))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [service]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ConfigMissing message={`Connect Supabase (see README.md) to list ${entityName.toLowerCase()}s.`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-stone-500 dark:text-stone-400">{description}</p>}
      </header>

      {error ? (
        <ErrorState message={error} />
      ) : !items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${entityName.toLowerCase()}s yet`}
          description={`${entityName}s will appear here once images are organized.`}
          icon={ImageOff}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/${routePrefix}/${item.slug}`}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                {item.cover_public_id ? (
                  <img
                    src={cloudinaryUrl({ publicId: item.cover_public_id, width: 600 })}
                    alt={item.name}
                    loading="lazy"
                    className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${showPoster ? 'blur-md scale-105' : 'blur-0 scale-100'
                      }`}
                  />
                ) : item.avatar_url ? (
                  <img src={item.avatar_url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <Camera className="h-10 w-10 text-stone-300 dark:text-stone-600" aria-hidden />
                  </div>
                )}
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                  {formatNumber(item.image_count)} {item.image_count === 1 ? 'image' : 'images'}
                </span>
              </div>
              <div className="p-4">
                <h2 className="font-medium text-stone-900 dark:text-stone-100">{item.name}</h2>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">{item.description}</p>
                )}
                {item.bio && <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">{item.bio}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
