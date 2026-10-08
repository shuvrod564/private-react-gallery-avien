import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getImageById, updateImage } from '../../services/imageService';
import { uploadToCloudinary, deleteCloudinaryAsset } from '../../services/cloudinaryService';
import { categoryService } from '../../services/categoryService';
import { tagService } from '../../services/tagService';
import { authorService } from '../../services/authorService';
import { albumService } from '../../services/albumService';
import { imageMetadataSchema } from '../../schemas/imageSchemas';
import { cloudinaryUrl } from '../../lib/cloudinary';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { TagInput } from '../../components/forms/TagInput';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../contexts/ToastContext';
import { usePoster } from '../../contexts/PosterContext';

export default function EditImage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  useDocumentTitle('Edit image', { description: 'Edit image metadata.' });
  const { showPoster, togglePoster } = usePoster();

  const [image, setImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [], authors: [], albums: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [newAsset, setNewAsset] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(imageMetadataSchema) });

  useEffect(() => {
    let active = true;
    Promise.all([
      getImageById(id),
      categoryService.listAll(),
      tagService.listAll(),
      authorService.listAll(),
      albumService.listAll(),
    ])
      .then(([img, categories, allTags, authors, albums]) => {
        if (!active) return;
        if (!img) {
          setError('Image not found.');
          return;
        }
        setImage(img);
        setOptions({ categories, tags: allTags, authors, albums });
        setTags(allTags.filter((t) => img.tagIds.includes(t.id)));
        reset({
          title: img.title,
          description: img.description || '',
          caption: img.caption || '',
          alt_text: img.alt_text || '',
          category_id: img.category_id || '',
          author_id: img.author_id || '',
          album_id: img.album_id || '',
          is_featured: img.is_featured,
          is_published: img.is_published,
          allow_download: img.allow_download,
          sort_order: img.sort_order,
        });
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, reset]);

  const featured = watch('is_featured');
  const published = watch('is_published');
  const download = watch('allow_download');

  async function onSubmit(values) {
    try {
      await updateImage(id, {
        ...values,
        category_id: values.category_id || null,
        author_id: values.author_id || null,
        album_id: values.album_id || null,
        tags: tags.map((t) => t.id).filter((tid) => !String(tid).startsWith('new-')),
      });
      toast.success('Image updated.');
      navigate('/admin/images');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  /**
   * Replace image (spec §27): upload new → verify → update DB → delete old.
   * The old CDN asset is only removed after the new one is confirmed in the DB.
   */
  async function handleReplace() {
    if (!newAsset) return;
    setReplacing(true);
    try {
      const oldPublicId = image.cloudinary_public_id;
      await updateImage(id, { ...newAsset });
      if (oldPublicId && oldPublicId !== newAsset.public_id) {
        try {
          await deleteCloudinaryAsset(oldPublicId);
        } catch {
          toast.error('New image saved, but the old CDN file could not be removed. You can clean it up later.');
        }
      }
      toast.success('Image replaced.');
      setConfirmReplace(false);
      setNewAsset(null);
      navigate('/admin/images');
    } catch {
      toast.error('Failed to replace the image. The new file is still in Cloudinary; please retry.');
    } finally {
      setReplacing(false);
    }
  }

  async function pickReplacement(file) {
    if (!file) return;
    try {
      const asset = await uploadToCloudinary(file, { folder: 'personal-gallery' });
      setNewAsset(asset);
      setConfirmReplace(true);
    } catch {
      toast.error('Replacement upload failed. Please try again.');
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!image) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/images" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to images
        </Link>
        <Link to={`/image/${image.slug}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400">View public page</Link>
      </div>

      <header>
        <h1 className="font-display text-2xl font-semibold">Edit image</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Editing metadata does not require re-uploading the image (spec §26).</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Current image + replace */}
        <div className="flex flex-row gap-4 sm:flex-row md:flex-col items-center">
          <div
            onClick={() => togglePoster?.()}
            className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl md:h-auto md:w-full md:aspect-square"
            title="Click image preview to toggle blur"
          >
            {image.cloudinary_public_id && (
              <img
                src={cloudinaryUrl({ publicId: image.cloudinary_public_id, width: 480 })}
                alt={image.alt_text || image.title}
                className={`h-full w-full object-cover transition-all duration-300 ${showPoster ? "blur-md scale-110" : "blur-0 scale-100"
                  }`}
              />
            )}
          </div>
          <div className="flex-1 border-l sm:border-l-0 sm:border-t border-slate-300 dark:border-black/50 pl-3 sm:pl-0 sm:pt-4">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
              Replace image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="mt-2 block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-700 dark:text-stone-400 dark:file:bg-white dark:file:text-stone-900"
              onChange={(e) => pickReplacement(e.target.files?.[0])}
            />
            <p className="mt-1 text-xs text-stone-400">
              The old file is deleted from Cloudinary only after the new one is saved.
            </p>
          </div>
        </div>

        {/* Metadata form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900" noValidate>
          <Field label="Title" htmlFor="title" required error={errors.title?.message}>
            <Input id="title" {...register('title')} invalid={!!errors.title} />
          </Field>
          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>
          <Field label="Caption" htmlFor="caption" error={errors.caption?.message}>
            <Input id="caption" {...register('caption')} />
          </Field>
          <Field label="Alt text" htmlFor="alt" error={errors.alt_text?.message}>
            <Input id="alt" {...register('alt_text')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category" htmlFor="category" error={errors.category_id?.message}>
              <Select id="category" {...register('category_id')}>
                <option value="">None</option>
                {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Author" htmlFor="author" error={errors.author_id?.message}>
              <Select id="author" {...register('author_id')}>
                {options.authors.map((a, index) => (
                  <option key={a.id} value={a.id} defaultValue={index === 0}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Album" htmlFor="album" error={errors.album_id?.message}>
              <Select id="album" {...register('album_id')}>
                {options.albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Tags">
            <TagInput value={tags} suggestions={options.tags} onChange={setTags} />
          </Field>

          <div className="flex flex-wrap gap-6 pt-2 mb-16 md:mb-0">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={published} onChange={(v) => setValue('is_published', v)} label="Published" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={featured} onChange={(v) => setValue('is_featured', v)} label="Featured" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={download} onChange={(v) => setValue('allow_download', v)} label="Allow download" />
              Allow download
            </label>
          </div>

          <div className="flex justify-center md:justify-end gap-3 border-t border-stone-200 pt-4 dark:border-stone-800 fixed bottom-0 right-0 z-40 md:static bg-white pb-2 w-full md:w-auto mt-4">
            <Link to="/admin/images"><Button variant="outline">Cancel</Button></Link>
            <Button type="submit" loading={isSubmitting}>
              <Save className="h-4 w-4" aria-hidden /> Save changes
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        title="Replace this image?"
        description="The new file will be saved first, then the old CDN file will be deleted. This cannot be easily undone."
        confirmLabel="Replace image"
        onClose={() => { setConfirmReplace(false); setNewAsset(null); }}
        onConfirm={handleReplace}
        loading={replacing}
      />
    </div>
  );
}
