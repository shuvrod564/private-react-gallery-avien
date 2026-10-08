import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { TaxonomyForm } from '../forms/TaxonomyForm';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState, ErrorState, Spinner } from '../ui/Feedback';
import { useToast } from '../../contexts/ToastContext';
import { formatNumber } from '../../utils/format';

/**
 * Shared CRUD manager for categories / tags / authors / albums
 * (spec §29–§32). Search, create, edit, delete with confirmation.
 */
export function AdminTaxonomy({ title, entityName, service, schema }) {
  useDocumentTitle(title, { description: `Manage ${entityName.toLowerCase()}s.` });
  const toast = useToast();

  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await service.listWithCounts();
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [service]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = (rows || []).filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await service.remove(deleteItem.id);
      toast.success(`${entityName} deleted.`);
      setDeleteItem(null);
      load();
    } catch {
      toast.error('Could not delete. It may still have images attached.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{rows ? `${rows.length} total` : ''}</p>
        </div>
        <Button onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" aria-hidden /> New {entityName.toLowerCase()}
        </Button>
      </header>

      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
        <Search className="h-4 w-4 text-stone-400" aria-hidden />
        <Input
          type="search"
          placeholder={`Search ${entityName.toLowerCase()}s…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-0 bg-transparent focus:ring-0 dark:bg-transparent"
          aria-label={`Search ${entityName.toLowerCase()}s`}
        />
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : !rows ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title={`No ${entityName.toLowerCase()}s found`} description="Try a different search, or create a new one." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {filtered.map((row) => (
              <li key={row.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.name}</p>
                  {row.description && <p className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">{row.description}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  {formatNumber(row.image_count)} image{row.image_count === 1 ? '' : 's'}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => { setEditItem(row); setFormOpen(true); }}
                    aria-label={`Edit ${row.name}`}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteItem(row)}
                    aria-label={`Delete ${row.name}`}
                    className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TaxonomyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        service={service}
        schema={schema}
        entityLabel={entityName.toLowerCase()}
        editItem={editItem}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        title={`Delete this ${entityName.toLowerCase()}?`}
        description={`"${deleteItem?.name}" will be removed. Images referencing it will become uncategorized (they are not deleted).`}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
