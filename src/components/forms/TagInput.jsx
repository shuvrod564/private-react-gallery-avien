import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Multi-select tag input with autocomplete against existing tags
 * (spec §30 — tag autocomplete during upload).
 */
export function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Add tags…' }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const query = text.trim().toLowerCase();
  const filtered = suggestions.filter(
    (t) => t.name.toLowerCase().includes(query) && !value.some((v) => v.id === t.id),
  ).slice(0, 6);

  function addByName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = suggestions.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!value.some((v) => v.id === existing.id)) onChange([...value, existing]);
    } else {
      onChange([...value, { id: `new-${trimmed.toLowerCase()}`, name: trimmed, slug: '' }]);
    }
    setText('');
  }

  function remove(id) {
    onChange(value.filter((v) => v.id !== id));
  }

  return (
    <div className="relative">
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 dark:border-stone-600 dark:bg-stone-900 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-900">
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200"
          >
            {tag.name}
            <button type="button" onClick={() => remove(tag.id)} aria-label={`Remove tag ${tag.name}`} className="text-brand-600 hover:text-brand-800 dark:text-brand-300">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addByName(text);
            } else if (e.key === 'Backspace' && !text && value.length) {
              remove(value[value.length - 1].id);
            }
          }}
          placeholder={value.length ? '' : placeholder}
          aria-label="Add tag"
          className="min-w-[100px] flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-stone-100"
        />
      </div>
      {focused && query && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addByName(t.name);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
