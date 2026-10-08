import { ImageCard } from "./ImageCard";

/**
 * Responsive grid (spec §42): 1–2 columns on mobile, 2–3 tablet, 3–5 desktop.
 * `onOpen` enables lightbox mode; otherwise cards link to detail pages.
 */
export function ImageGrid({ images, onOpen, columns = 4 }) {
  return (
    <div
      className={`columns-3
        sm:columns-3
        lg:columns-4
        2xl:columns-5
        gap-1.5 md:gap-3 ${
        columns >= 4 ? "xl:grid-cols-4" : ""
      } ${columns >= 5 ? "2xl:grid-cols-5" : ""}`}
    >
      {images.map((image) => (
        <div key={image.id} className="mb-1.5 md:mb-3 break-inside-avoid">
          <ImageCard image={image} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}
