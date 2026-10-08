const TONES = {
  neutral: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
  brand: 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PublishedBadge({ published }) {
  return <Badge tone={published ? 'green' : 'neutral'}>{published ? 'Published' : 'Draft'}</Badge>;
}

export function FeaturedBadge({ featured }) {
  if (!featured) return null;
  return (
    <Badge tone="brand" className="!bg-brand-500 !text-white">
      ★ Featured
    </Badge>
  );
}
