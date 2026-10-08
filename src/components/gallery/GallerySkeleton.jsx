/** Loading skeletons for the gallery (spec §51). */
export function ImageCardSkeleton() {
  return (
    <div className="skeleton aspect-[4/3] rounded-xl" aria-hidden />
  );
}

export function GallerySkeleton({ count = 12, columns = 4 }) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 ${
        columns >= 4 ? 'xl:grid-cols-4' : ''
      } ${columns >= 5 ? '2xl:grid-cols-5' : ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ImageCardSkeleton key={i} />
      ))}
    </div>
  );
}
