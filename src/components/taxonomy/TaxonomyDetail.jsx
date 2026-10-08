import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ImageOff, ArrowLeft, ExternalLink } from "lucide-react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useImages } from "../../hooks/useImages";
import { isSupabaseConfigured } from "../../lib/env";
import { ImageGrid } from "../gallery/ImageGrid";
import { Lightbox } from "../gallery/Lightbox";
import { GallerySkeleton } from "../gallery/GallerySkeleton";
import { EmptyState, ErrorState, ConfigMissing, Spinner } from "../ui/Feedback";
import { cloudinaryUrl } from "../../lib/cloudinary";

export function TaxonomyDetail({
  service,
  routePrefix,
  entityName,
  singular,
  field,
}) {
  const { slug } = useParams();
  const [entity, setEntity] = useState(null);
  const [entityError, setEntityError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const {
    items,
    total,
    loading,
    loadMore,
    hasMore,
    loadingMore,
    error: imagesError,
    retry,
  } = useImages({
    filters: { [field]: slug, sort: "newest" },
    publishedOnly: true,
  });

  useDocumentTitle(entity?.name || singular, {
    description: entity?.description || entity?.bio || "",
    canonicalPath: `/${routePrefix}/${slug}`,
    image: entity?.cover_public_id
      ? cloudinaryUrl({ publicId: entity.cover_public_id, width: 1200 })
      : undefined,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    setEntityError(null);
    service
      .getBySlug(slug)
      .then((row) => {
        if (active) setEntity(row);
      })
      .catch((err) => {
        if (active) setEntityError(err?.message || "Failed to load details.");
      });
    return () => {
      active = false;
    };
  }, [slug, service]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ConfigMissing
          message={`Connect Supabase (see README.md) to view ${singular.toLowerCase()} pages.`}
        />
      </div>
    );
  }

  const showError = entityError || imagesError;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        to={`/${routePrefix}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All{" "}
        {entityName.toLowerCase()}
      </Link>

      {/* Header */}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-stone-200 dark:bg-stone-800">
          {entity?.cover_public_id && (
            <img
              src={cloudinaryUrl({
                publicId: entity.cover_public_id,
                width: 160,
                height: 160,
              })}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">
            {entity?.name || "…"}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {entity ? `${total} image${total === 1 ? "" : "s"}` : "…"}
          </p>
          {entity?.description && (
            <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
              {entity.description}
            </p>
          )}
          {entity?.bio && (
            <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">
              {entity.bio}
            </p>
          )}
          {entity?.website_url && (
            <a
              href={entity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Visit website <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </header>

      {showError ? (
        <ErrorState message={String(showError)} onRetry={retry} />
      ) : loading ? (
        <GallerySkeleton count={9} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No images in this ${singular.toLowerCase()}`}
          description={`Images tagged with this ${singular.toLowerCase()} will appear here.`}
          icon={ImageOff}
        />
      ) : (
        <>
          {/* <ImageGrid images={items} />*/}
          <ImageGrid
            images={items}
            onOpen={(img) => {
              const index = items.findIndex((item) => item.id === img.id);
              setLightboxIndex(index);
            }}
          />
          {lightboxIndex !== null && (
            <Lightbox
              images={items}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onNavigate={setLightboxIndex}
            />
          )}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-5 text-sm font-medium hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                {loadingMore ? <Spinner className="h-4 w-4" /> : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
