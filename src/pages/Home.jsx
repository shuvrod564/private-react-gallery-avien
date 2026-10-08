import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getFeaturedImages, getLatestImages } from '../services/imageService';
import { categoryService } from '../services/categoryService';
import { tagService } from '../services/tagService';
import { albumService } from '../services/albumService';
import { isSupabaseConfigured } from '../lib/env';
import { ImageGrid } from '../components/gallery/ImageGrid';
import { GallerySkeleton } from '../components/gallery/GallerySkeleton';
import { ConfigMissing } from '../components/ui/Feedback';
import { cloudinaryUrl } from '../lib/cloudinary';
import { usePoster } from '../contexts/PosterContext';

export default function Home() {
  useDocumentTitle('', { description: 'A personal collection of photographs.' });

  const [featured, setFeatured] = useState(null);
  const [latest, setLatest] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [error, setError] = useState(null);
  const { showPoster } = usePoster();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    Promise.all([
      getFeaturedImages(6),
      getLatestImages(12),
      categoryService.listWithCounts(),
      tagService.listWithCounts(),
      albumService.listWithCounts(),
    ])
      .then(([feat, lat, cats, tgs, albs]) => {
        if (!active) return;
        setFeatured(feat);
        setLatest(lat);
        setCategories(cats.filter((c) => c.image_count > 0).slice(0, 6));
        setTags(tgs.filter((t) => t.image_count > 0).slice(0, 10));
        setAlbums(albs.filter((a) => a.image_count > 0).slice(0, 4));
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  const hero = featured?.[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-brand-900" />
        {hero?.cloudinary_public_id && (
          <img
            src={cloudinaryUrl({ publicId: hero.cloudinary_public_id, width: 1600 })}
            alt=""
            aria-hidden
            className={`absolute inset-0 h-full w-full object-cover opacity-25 transition-all duration-500 ${
              showPoster ? 'blur-md scale-105' : 'blur-0 scale-100'
            }`}
          />
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <p className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-brand-200 backdrop-blur">
            <Camera className="h-3.5 w-3.5" aria-hidden /> A personal collection of photographs
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Moments, captured and curated.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-stone-300 sm:text-lg">
            Browse a growing gallery of personal photography — search, filter by category and tag, and explore curated
            albums.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/gallery"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 font-medium text-white shadow-lg transition-colors hover:bg-brand-600"
            >
              Browse gallery <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/categories"
              className="inline-flex h-12 items-center rounded-xl border border-white/25 px-6 font-medium text-white transition-colors hover:bg-white/10"
            >
              Explore categories
            </Link>
          </div>
        </div>
      </section>

      {!isSupabaseConfigured ? (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <ConfigMissing message="Connect Supabase and Cloudinary (see README.md) and the gallery will appear here." />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="text-center text-sm text-red-600 dark:text-red-400">Something went wrong. Please try again.</p>
        </div>
      ) : (
        <>
          {/* Featured */}
          <section className="mx-auto max-w-7xl px-2 py-12 sm:px-6">
            <SectionHeader title="Featured" subtitle="Hand-picked highlights" linkTo="/gallery?featured=true" linkLabel="See all" />
            {featured ? <ImageGrid images={featured} /> : <GallerySkeleton count={6} />}
            {featured?.length === 0 && <EmptyLine text="No featured images yet." />}
          </section>

          {/* Latest */}
          <section className="mx-auto max-w-7xl px-2 pb-12 sm:px-6">
            <SectionHeader title="Latest" subtitle="Newest additions" linkTo="/gallery" linkLabel="See all" />
            {latest ? <ImageGrid images={latest} /> : <GallerySkeleton count={12} />}
            {latest?.length === 0 && <EmptyLine text="No images yet — check back soon." />}
          </section>

          {/* Categories + tags + albums */}
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-3">
                <h2 className="font-display text-xl font-semibold">Popular categories</h2>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/category/${c.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2 pr-4 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900"
                  >
                    <Cover thumb={c.cover_public_id} alt={c.name} />
                    <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-stone-400">{c.image_count}</span>
                  </Link>
                ))}
                {categories.length === 0 && <EmptyLine text="No categories yet." />}
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-xl font-semibold">Popular tags</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tag/${t.slug}`}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                    >
                      #{t.name}
                      <span className="ml-1 text-xs text-stone-400">{t.image_count}</span>
                    </Link>
                  ))}
                </div>
                {tags.length === 0 && <EmptyLine text="No tags yet." />}
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-xl font-semibold">Featured albums</h2>
                {albums.map((a) => (
                  <Link
                    key={a.id}
                    to={`/album/${a.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2 pr-4 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900"
                  >
                    <Cover thumb={a.cover_public_id} alt={a.name} />
                    <span className="flex-1 truncate text-sm font-medium">{a.name}</span>
                    <span className="text-xs text-stone-400">{a.image_count} photos</span>
                  </Link>
                ))}
                {albums.length === 0 && <EmptyLine text="No albums yet." />}
              </div>
            </div>
          </section>
        </>
      )}

      {/* CTA */}
      <section className="border-t border-stone-200 bg-white py-16 text-center dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-display text-2xl font-semibold">Ready to explore?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Open the full gallery with search, filters, and sorting.
        </p>
        <Link
          to="/gallery"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-stone-900 px-6 font-medium text-white transition-colors hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
        >
          Open gallery <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle, linkTo, linkLabel }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Cover({ thumb, alt }) {
  const { showPoster } = usePoster();
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
      {thumb ? ( 
        <img src={cloudinaryUrl({ publicId: thumb, width: 96, height: 96 })} alt={alt} loading="lazy"  
          className={`h-full w-full object-cover opacity-25 transition-all duration-500 ${
            showPoster ? 'blur-md scale-105' : 'blur-0 scale-100'
          }`}
        />
      ) : (
        <Camera className="h-5 w-5 text-stone-300 dark:text-stone-600" aria-hidden />
      )}
    </span>
  );
}

function EmptyLine({ text }) {
  return <p className="py-4 text-sm text-stone-400 dark:text-stone-500">{text}</p>;
}
