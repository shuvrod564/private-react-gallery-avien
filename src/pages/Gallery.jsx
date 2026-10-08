import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ImageOff, SlidersHorizontal, X } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useDebounce } from "../hooks/useDebounce";
import { useImages } from "../hooks/useImages";
import { isSupabaseConfigured } from "../lib/env";
import { FilterPanel } from "../components/filters/FilterPanel";
import { MasonryGrid } from "../components/gallery/MasonryGrid";
import { GallerySkeleton } from "../components/gallery/GallerySkeleton";
import { Lightbox } from "../components/gallery/Lightbox";
import {
  EmptyState,
  ErrorState,
  ConfigMissing,
  Spinner,
} from "../components/ui/Feedback";
import { categoryService } from "../services/categoryService";
import { tagService } from "../services/tagService";
import { authorService } from "../services/authorService";
import { albumService } from "../services/albumService";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";

export default function Gallery() {
  useDocumentTitle("Gallery", {
    description: "Browse the full image collection with search and filters.",
  });
  const [params, setParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const [showFilter, setShowFilter] = useState(false);

  // Filters live in the URL (spec §21) so refresh/bookmark/share/back all work.
  const filters = useMemo(
    () => ({
      q: params.get("q") || "",
      category: params.get("category") || "",
      tag: params.get("tag") || "",
      author: params.get("author") || "",
      album: params.get("album") || "",
      featured: params.get("featured") || "",
      dateFrom: params.get("dateFrom") || "",
      dateTo: params.get("dateTo") || "",
      status: isAdmin ? params.get("status") || "" : "",
      sort: params.get("sort") || "newest",
    }),
    [params, isAdmin],
  );

  const debouncedQ = useDebounce(filters.q, 400);
  const queryFilters = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );

  const {
    items,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  } = useImages({
    filters: queryFilters,
    publishedOnly: !isAdmin,
  });

  const [taxonomies, setTaxonomies] = useState({
    categories: [],
    tags: [],
    authors: [],
    albums: [],
  });
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    Promise.all([
      categoryService.listAll(),
      tagService.listAll(),
      authorService.listAll(),
      albumService.listAll(),
    ])
      .then(([categories, tags, authors, albums]) => {
        if (active) setTaxonomies({ categories, tags, authors, albums });
      })
      .catch((err) => {
        console.warn("Failed to load taxonomy for filter panel:", err?.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateFilters = useCallback(
    (next) => {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) {
        if (v && v !== "newest") sp.set(k, v);
      }
      setParams(sp, { replace: false });
    },
    [setParams],
  );

  const clearFilters = useCallback(
    () => setParams({}, { replace: false }),
    [setParams],
  );

  const activeFilterCount = [
    filters.q,
    filters.category,
    filters.tag,
    filters.author,
    filters.album,
    filters.dateFrom,
    filters.dateTo,
    filters.featured,
    filters.status,
  ].filter(Boolean).length;

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore)
          loadMore();
      },
      { rootMargin: "400px" },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, loadMore, items.length]);

  const showStatusFilter = isAdmin && isSupabaseConfigured;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Gallery
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {isSupabaseConfigured
                ? `${total} image${total === 1 ? "" : "s"} found`
                : "Browse, search, and filter the collection."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                {activeFilterCount}
              </span>
            )}
            <Button
              variant={showFilter ? "primary" : "secondary"}
              size="sm"
              onClick={() => setShowFilter(!showFilter)}
            >
              {showFilter ? (
                <>
                  <X className="h-4 w-4" aria-hidden /> Close
                </>
              ) : (
                <>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <ConfigMissing message="Connect Supabase and Cloudinary (see README.md) and your gallery will load here." />
      ) : (
        <>
          {/* Filter panel — collapsible */}
          {showFilter && (
            <aside className="mb-8">
              <FilterPanel
                filters={filters}
                onChange={updateFilters}
                onClear={clearFilters}
                categories={taxonomies.categories}
                tags={taxonomies.tags}
                authors={taxonomies.authors}
                albums={taxonomies.albums}
                showStatus={showStatusFilter}
              />
            </aside>
          )}

          {/* Gallery results */}
          <section aria-label="Gallery results">
            {loading ? (
              <GallerySkeleton count={12} />
            ) : error ? (
              <ErrorState message={error} onRetry={retry} />
            ) : items.length === 0 ? (
              <EmptyState
                title="No images found"
                description="Try changing your filters or search term."
                icon={ImageOff}
              />
            ) : (
              <>
                <div className="flex items-center justify-between pb-4 text-sm text-stone-500 dark:text-stone-400">
                  <span>
                    Showing {items.length} of {total}
                  </span>
                  {hasMore && <span>Scroll for more</span>}
                </div>

                {/* Pinterest-style masonry waterfall */}
                <MasonryGrid
                  images={items}
                  onOpen={(img) =>
                    setLightboxIndex(items.findIndex((i) => i.id === img.id))
                  }
                />

                <div ref={sentinelRef} className="h-10" aria-hidden />
                {loadingMore && (
                  <div className="py-6">
                    <Spinner />
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
