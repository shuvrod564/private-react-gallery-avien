import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Confirmation dialog for destructive operations (spec §50, §16).
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be easily undone.',
  confirmLabel = 'Delete',
  destructive = true,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className={`shrink-0 rounded-full p-3 ${destructive ? 'bg-red-100 dark:bg-red-900/40' : 'bg-stone-100 dark:bg-stone-800'}`}>
          <AlertTriangle className={`h-6 w-6 ${destructive ? 'text-red-600 dark:text-red-300' : 'text-stone-500'}`} aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{description}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
