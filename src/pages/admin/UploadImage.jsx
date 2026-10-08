import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ImageUploadForm } from '../../components/forms/ImageUploadForm';
import { categoryService } from '../../services/categoryService';
import { tagService } from '../../services/tagService';
import { authorService } from '../../services/authorService';
import { albumService } from '../../services/albumService';
import { isCloudinaryConfigured, isSupabaseConfigured } from '../../lib/env';
import { ConfigMissing, ErrorState, Spinner } from '../../components/ui/Feedback';

export default function UploadImage() {
  useDocumentTitle('Upload image', { description: 'Upload new images.' });
  const [options, setOptions] = useState({ categories: [], tags: [], authors: [], albums: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([
      categoryService.listAll(),
      tagService.listAll(),
      authorService.listAll(),
      albumService.listAll(),
    ])
      .then(([categories, tags, authors, albums]) => {
        setOptions({ categories, tags, authors, albums });
        setLoading(false);
      })
      .catch((err) => {
        const msg = err?.message || 'Failed to load categories, tags, authors, and albums from Supabase.';
        setError(msg);
        setLoading(false);
      });
  }, []);

  if (!isCloudinaryConfigured) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <ConfigMissing message="Uploads need a Cloudinary cloud configured. Add VITE_CLOUDINARY_CLOUD_NAME (frontend) plus CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (server-side) to your .env, then restart the API server." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Upload images</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Files go to Cloudinary; metadata is saved to Supabase. A failed upload never blocks the others.
        </p>
      </header>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState
          message={
            error.includes('configured')
              ? `${error} See the README.md and .env.example for setup instructions.`
              : error
          }
        />
      ) : (
        <ImageUploadForm
          categories={options.categories}
          tags={options.tags}
          authors={options.authors}
          albums={options.albums}
        />
      )}
    </div>
  );
}
