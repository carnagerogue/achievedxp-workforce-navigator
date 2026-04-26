'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, ChevronDown } from 'lucide-react';
import {
  CatalogCategory,
  CatalogItem,
  customCode,
  labelFor,
  searchCatalog,
} from '../lib/catalogs';

/**
 * Searchable, categorized, custom-add-friendly chip picker.
 *
 * UX goals:
 *   - Selected items are always visible at the top, so the user can
 *     verify what they have without scrolling
 *   - A persistent search input filters across every category, but
 *     when empty the categories render their full content (browseable)
 *   - "Add custom" lets the user type a skill/cert that isn't in the
 *     catalog and instantly persists it (slugged via `customCode`)
 *   - Counter chip shows how many are selected, with a clear-all
 *     control next to it
 *   - Keyboard: Enter to add a custom entry, Escape to clear search
 */
interface Props {
  categories: CatalogCategory[];
  index: Record<string, CatalogItem>;
  selected: Set<string>;
  onToggle: (code: string) => void;
  onClear?: () => void;
  /** Word for the empty-state hint, e.g. "skill" or "certification". */
  itemNoun: string;
  /** Allow the user to add free-text entries. Defaults to true. */
  allowCustom?: boolean;
  /** Optional max items the user is encouraged to choose. UI hint only. */
  recommendedMax?: number;
}

export function RichChipPicker({
  categories,
  index,
  selected,
  onToggle,
  onClear,
  itemNoun,
  allowCustom = true,
  recommendedMax,
}: Props) {
  const [query, setQuery] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c.key, true]))
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => searchCatalog(query, categories), [query, categories]);
  const filteredByCat = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.map((c) => ({ ...c, items: c.items }));
    const set = new Set(filtered.map((i) => i.code));
    return categories
      .map((c) => ({ ...c, items: c.items.filter((i) => set.has(i.code)) }))
      .filter((c) => c.items.length > 0);
  }, [query, filtered, categories]);

  // If the user types something that doesn't match any catalog item but
  // is a plausible custom entry, surface a single-button "Add" affordance.
  const customCandidate = useMemo(() => {
    if (!allowCustom) return null;
    const q = query.trim();
    if (!q || q.length < 2) return null;
    const code = customCode(q);
    if (!code) return null;
    if (index[code] || selected.has(code)) return null;
    if (filtered.some((i) => i.code === code)) return null;
    return { code, label: q };
  }, [query, allowCustom, filtered, index, selected]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customCandidate) {
      e.preventDefault();
      onToggle(customCandidate.code);
      setQuery('');
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected row + counter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${selected.size > 0 ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' : 'bg-slate-100 text-slate-600'}`}>
          {selected.size} selected{recommendedMax ? ` (recommended: ${recommendedMax})` : ''}
        </span>
        {selected.size > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-500 hover:text-rose-700 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Currently-selected chips — always visible */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(selected).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onToggle(code)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              title="Remove"
            >
              <span className="capitalize">{labelFor(code, index)}</span>
              <X className="h-3 w-3 opacity-60 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Search or add a ${itemNoun}…`}
          className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* "Add custom" affordance */}
      {customCandidate && (
        <button
          type="button"
          onClick={() => { onToggle(customCandidate.code); setQuery(''); }}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-teal-400 bg-teal-50/60 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add custom: <span className="font-bold">{customCandidate.label}</span>
        </button>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {filteredByCat.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Nothing matches &ldquo;{query}&rdquo;. Press Enter to add it as a custom entry.
          </p>
        ) : (
          filteredByCat.map((cat) => {
            const isOpen = !!openCats[cat.key] || !!query.trim();
            return (
              <section key={cat.key} className="rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenCats((s) => ({ ...s, [cat.key]: !s[cat.key] }))}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                  aria-expanded={isOpen}
                >
                  <span>{cat.label} <span className="ml-1 font-normal text-slate-400">· {cat.items.length}</span></span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-200 px-3 py-2.5">
                    {cat.items.map((item) => {
                      const isSelected = selected.has(item.code);
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => onToggle(item.code)}
                          className={
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ' +
                            (isSelected
                              ? 'border-teal-500 bg-teal-600 text-white shadow-sm hover:bg-teal-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800')
                          }
                          aria-pressed={isSelected}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
