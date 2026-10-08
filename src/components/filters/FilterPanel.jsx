import { SlidersHorizontal, X, Search } from 'lucide-react';
import { Input, Select } from '../ui/Field';
import { SORT_OPTIONS } from '../../utils/constants';

/**
 * Gallery filter panel (spec §20). All state lives in the URL (spec §21) —
 * this component just renders current values and calls back.
 */
export function FilterPanel({
  filters,
  onChange,
  categories = [],
  tags = [],
  authors = [],
  albums = [],
  showStatus = false,
  onClear,
}) {
  const set = (key) => (e) => {
    const value = e.target.value;
    onChange({ ...filters, [key]: value });
  };

  const activeCount = [
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

  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Clear ({activeCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <Input
          type="search"
          value={filters.q || ''}
          onChange={set('q')}
          placeholder="Search title, tags, author…"
          aria-label="Search images"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Category</span>
          <Select value={filters.category || ''} onChange={set('category')} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Tag</span>
          <Select value={filters.tag || ''} onChange={set('tag')} aria-label="Filter by tag">
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Author</span>
          <Select value={filters.author || ''} onChange={set('author')} aria-label="Filter by author">
            <option value="">All authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.slug}>
                {a.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Album</span>
          <Select value={filters.album || ''} onChange={set('album')} aria-label="Filter by album">
            <option value="">All albums</option>
            {albums.map((a) => (
              <option key={a.id} value={a.slug}>
                {a.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Date from</span>
          <Input type="date" value={filters.dateFrom || ''} onChange={set('dateFrom')} aria-label="Filter from date" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Date to</span>
          <Input type="date" value={filters.dateTo || ''} onChange={set('dateTo')} aria-label="Filter to date" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Featured</span>
          <Select value={filters.featured || ''} onChange={set('featured')} aria-label="Filter by featured">
            <option value="">All</option>
            <option value="true">Featured</option>
            <option value="false">Not featured</option>
          </Select>
        </label>

        {showStatus && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Status</span>
            <Select value={filters.status || ''} onChange={set('status')} aria-label="Filter by status">
              <option value="">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </label>
        )}

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-stone-400">Sort</span>
          <Select value={filters.sort || 'newest'} onChange={set('sort')} aria-label="Sort images">
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );
}
