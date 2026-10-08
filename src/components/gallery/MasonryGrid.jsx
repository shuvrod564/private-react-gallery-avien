import { ImageCard } from './ImageCard';

/**
 * Pinterest-style masonry waterfall layout.
 * Uses CSS columns which naturally stack items of varying heights.
 */
export function MasonryGrid({ images, onOpen }) {
  return (
    <div className="columns-2 gap-2 md:gap-3 lg:gap-4 sm:columns-3 lg:columns-4 xl:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {images.map((image) => (
        <ImageCard key={image.id} image={image} onOpen={onOpen} />
      ))}
    </div>
  );
}
