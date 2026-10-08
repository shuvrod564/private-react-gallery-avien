import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pencil, Eye, ChevronLeft, ChevronRight, Copy, Check, Star } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import {
  listImages,
  deleteImage,
  setImageFeatured,
  setImagePublished,
  bulkUpdateImages,
  bulkAddTags,
  bulkRemoveTags,
} from '../../services/imageService';
import { categoryService } from '../../services/categoryService';
import { albumService } from '../../services/albumService';
import { tagService } from '../../services/tagService';
import { authorService } from '../../services/authorService';
import { cloudinaryUrl } from '../../lib/cloudinary';
import { formatDate, formatNumber } from '../../utils/format';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { PublishedBadge, FeaturedBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { TagInput } from '../../components/forms/TagInput';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../contexts/ToastContext';

export default function AdminImages() {
  useDocumentTitle('Manage images', { description: 'Manage gallery images.' });
  const toast = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [filters, setFilters] = useState({ category: '', author: '', album: '', status: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(new Set());
  const [taxonomies, setTaxonomies] = useState({ categories: [], albums: [], tags: [], authors: [] });

  const [confirmDelete, setConfirmDelete] = useState(null); // single image
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(null); // 'category' | 'album' | 'addtags' | 'removetags'
  const [bulkValue, setBulkValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  const pageSize = DEFAULT_PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items, total: t } = await listImages({
        q: debouncedSearch,
        category: filters.category,
        author: filters.author,
        album: filters.album,
        status: filters.status,
        sort: filters.sort,
        page,
        pageSize,
        publishedOnly: false,
      });
      setRows(items);
      setTotal(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      categoryService.listAll(),
      albumService.listAll(),
      tagService.listAll(),
      authorService.listAll(),
    ]).then(([categories, albums, tags, authors]) => setTaxonomies({ categories, albums, tags, authors })).catch(() => {});
  }, []);

  useEffect(() => setPage(1), [debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  async function handleDelete(id) {
    setDeleting(true);
    const result = await deleteImage(id);
    setDeleting(false);
    setConfirmDelete(null);
    if (result.ok) {
      toast.success('Image deleted.');
      load();
    } else {
      toast.error(`Database record deleted, but the CDN file could not be removed: ${result.cloudinaryError}. You can retry from Cloudinary.`);
      load();
    }
  }

  async function handleBulkDelete() {
    setDeleting(true);
    let ok = 0;
    const ids = Array.from(selected);
    for (const id of ids) {
      const r = await deleteImage(id);
      if (r.ok) ok += 1;
    }
    setDeleting(false);
    setConfirmBulkDelete(false);
    setSelected(new Set());
    toast.success(`${ok} of ${ids.length} images deleted.`);
    load();
  }

  async function handleBulkAction() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      switch (bulkDialog) {
        case 'category':
          if (!bulkValue) return toast.error('Select a category.');
          await bulkUpdateImages(ids, { category_id: bulkValue });
          break;
        case 'album':
          await bulkUpdateImages(ids, { album_id: bulkValue || null });
          break;
        case 'addtags': {
          const tagIds = bulkValue.map((t) => t.id).filter((id) => !String(id).startsWith('new-'));
          await bulkAddTags(ids, tagIds);
          break;
        }
        case 'removetags': {
          const tagIds = bulkValue.map((t) => t.id).filter((id) => !String(id).startsWith('new-'));
          await bulkRemoveTags(ids, tagIds);
          break;
        }
        default:
          return;
      }
      toast.success('Bulk update applied.');
      setBulkDialog(null);
      setBulkValue('');
      setSelected(new Set());
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  async function togglePublish(img) {
    try {
      await setImagePublished(img.id, !img.is_published);
      toast.success(img.is_published ? 'Unpublished.' : 'Published.');
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  async function toggleFeature(img) {
    try {
      await setImageFeatured(img.id, !img.is_featured);
      toast.success(img.is_featured ? 'Removed from featured.' : 'Marked as featured.');
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  const bulkActions = useMemo(
    () => [
      { label: 'Publish', action: async () => { await bulkUpdateImages(Array.from(selected), { is_published: true }); toast.success('Published.'); load(); } },
      { label: 'Unpublish', action: async () => { await bulkUpdateImages(Array.from(selected), { is_published: false }); toast.success('Unpublished.'); load(); } },
      { label: 'Set category…', dialog: 'category' },
      { label: 'Set album…', dialog: 'album' },
      { label: 'Add tags…', dialog: 'addtags' },
      { label: 'Remove tags…', dialog: 'removetags' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, load],
  );

  // Solid backgrounds are required on sticky cells, otherwise the
  // columns scrolling underneath bleed through.
  const stickyLeftCell = (isSelected) =>
    `sticky left-0 z-10 px-2 md:px-4 py-1.5 md:py-3 shadow-[12px_0_16px_-10px_rgba(0,0,0,0.12)] ${
      isSelected ? 'bg-brand-50 dark:bg-brand-950' : 'bg-white dark:bg-stone-900'
    }`;

  const stickyRightCell = (isSelected) =>
    `sticky right-0 z-10 px-1 py-3 sm:px-4 shadow-[-12px_0_16px_-10px_rgba(0,0,0,0.12)] ${
      isSelected ? 'bg-brand-50 dark:bg-brand-950' : 'bg-white dark:bg-stone-900'
    }`;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Images</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{total} image(s)</p>
        </div>
        <Link to="/admin/images/upload">
          <Button><Plus className="h-4 w-4" aria-hidden /> Upload image</Button>
        </Link>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
        <Input type="search" placeholder="Search images…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" aria-label="Search images" />
        <Select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="max-w-[160px]" aria-label="Filter category">
          <option value="">All categories</option>
          {taxonomies.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="max-w-[140px]" aria-label="Filter status">
          <option value="">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
        <Select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className="max-w-[180px]" aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_viewed">Most viewed</option>
          <option value="title_asc">Title A–Z</option>
        </Select>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-300 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-950/30">
          <span className="text-sm font-medium text-brand-800 dark:text-brand-200">{selected.size} selected</span>
          {bulkActions.map((b) =>
            b.dialog ? (
              <Button
                key={b.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkDialog(b.dialog);
                  setBulkValue(b.dialog === 'addtags' || b.dialog === 'removetags' ? [] : '');
                }}
              >
                {b.label}
              </Button>
            ) : (
              <Button key={b.label} variant="outline" size="sm" onClick={b.action}>{b.label}</Button>
            ),
          )}
          <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Cancel</Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No images found"
          description="Try changing filters, or upload your first image."
          action={<Link to="/admin/images/upload"><Button>Upload image</Button></Link>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          {/* border-separate is required for reliable sticky <td> rendering (esp. Chrome) */}
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-400">
              <tr className="[&_th]:border-b [&_th]:border-stone-200 dark:[&_th]:border-stone-800">
                <th className="sticky left-0 z-10 w-5 md:w-10 bg-white px-2 md:px-4 py-1.5 md:py-3 shadow-[12px_0_16px_-10px_rgba(0,0,0,0.12)] dark:bg-stone-900">
                  <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} aria-label="Select all" className="accent-brand-500" />
                </th>
                <th className="px-1 py-3 font-medium">Image</th>
                <th className="px-2 md:px-4 py-1.5 md:py-3 font-medium">Category</th>
                <th className="px-2 md:px-4 py-1.5 md:py-3 font-medium hidden md:table-cell">Author</th>
                <th className="px-2 md:px-4 py-1.5 md:py-3 font-medium hidden lg:table-cell">Status</th>
                <th className="px-2 md:px-4 py-1.5 md:py-3 font-medium hidden md:table-cell">Views</th>
                <th className="px-2 md:px-4 py-1.5 md:py-3 font-medium hidden lg:table-cell">Created</th>
                <th className="sticky right-0 z-10 bg-white px-2 md:px-4 py-1.5 md:py-3 text-right font-medium shadow-[-12px_0_16px_-10px_rgba(0,0,0,0.12)] dark:bg-stone-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-stone-100 dark:[&_td]:border-stone-800">
              {rows.map((img) => (
                <tr key={img.id} className={selected.has(img.id) ? 'bg-brand-50/60 dark:bg-brand-950/20' : ''}>
                  <td className={stickyLeftCell(selected.has(img.id))}>
                    <input type="checkbox" checked={selected.has(img.id)} onChange={() => toggleSelect(img.id)} aria-label={`Select ${img.title}`} className="accent-brand-500" />
                  </td>
                  <td className="px-1 py-3 w-12 md:w-auto">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
                        {img.cloudinary_public_id && <img src={cloudinaryUrl({ publicId: img.cloudinary_public_id, width: 112, height: 88 })} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </span>
                      <div className="min-w-0 max-w-[220px] hidden md:block">
                        <p className="truncate font-medium">{img.title}</p>
                        <div className="mt-0.5 flex gap-1">
                          <FeaturedBadge featured={img.is_featured} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 md:px-4 py-1.5 md:py-3 text-stone-500 dark:text-stone-400">{img.category?.name || '—'}</td>
                  <td className="px-2 md:px-4 py-1.5 md:py-3 text-stone-500 dark:text-stone-400 hidden md:table-cell">{img.author?.name || '—'}</td>
                  <td className="px-2 md:px-4 py-1.5 md:py-3 hidden lg:table-cell"><PublishedBadge published={img.is_published} /></td>
                  <td className="px-2 md:px-4 py-1.5 md:py-3 hidden md:table-cell">{formatNumber(img.view_count)}</td>
                  <td className="px-2 md:px-4 py-1.5 md:py-3 text-stone-500 dark:text-stone-400 hidden lg:table-cell">{formatDate(img.created_at)}</td>
                  <td className={`${stickyRightCell(selected.has(img.id))} w-[100px]`}>
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/image/${img.slug}`} aria-label="View" title="View" className="rounded-lg p-1.5 md:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"><Eye className="h-4 w-4" /></Link>
                      <Link to={`/admin/images/${img.id}/edit`} aria-label="Edit" title="Edit" className="rounded-lg p-1.5 md:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"><Pencil className="h-4 w-4" /></Link>
                      <button type="button" onClick={() => togglePublish(img)} title={img.is_published ? 'Unpublish' : 'Publish'} aria-label={img.is_published ? `Unpublish ${img.title}` : `Publish ${img.title}`} className="rounded-lg p-1.5 md:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 hidden lg:block">
                        {img.is_published ? <Copy className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => toggleFeature(img)} title="Toggle featured" aria-label={`Toggle featured on ${img.title}`} className={`rounded-lg p-1.5 md:p-2 hover:bg-stone-100 dark:hover:bg-stone-800 hidden lg:block ${img.is_featured ? 'text-amber-500' : 'text-stone-400'}`}>
                        <Star className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(img)} title="Delete" aria-label={`Delete ${img.title}`} className="rounded-lg p-1.5 md:p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
          </Button>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this image?"
        description={`"${confirmDelete?.title}" and its CDN file will be permanently removed. This cannot be easily undone.`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete.id)}
        loading={deleting}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selected.size} images?`}
        description="All selected images and their CDN files will be permanently removed."
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        loading={deleting}
      />

      <Modal open={Boolean(bulkDialog)} onClose={() => setBulkDialog(null)} title={bulkDialog?.replace(/^./, (c) => c.toUpperCase())} size="sm">
        {bulkDialog === 'category' && (
          <Field label="Assign category">
            <Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
              <option value="">Select…</option>
              {taxonomies.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        {bulkDialog === 'album' && (
          <Field label="Assign album (blank = remove)">
            <Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
              <option value="">No album</option>
              {taxonomies.albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        )}
        {(bulkDialog === 'addtags' || bulkDialog === 'removetags') && (
          <Field label={bulkDialog === 'addtags' ? 'Add tags' : 'Remove tags'}>
            <TagInput value={bulkValue} onChange={setBulkValue} suggestions={taxonomies.tags} />
          </Field>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setBulkDialog(null)}>Cancel</Button>
          <Button onClick={handleBulkAction}>Apply</Button>
        </div>
      </Modal>
    </div>
  );
}