import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import type { CommandItem } from '../model';
import { Dialog } from './Dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: readonly CommandItem[];
  onSelect: (item: CommandItem) => void;
}

function matches(item: CommandItem, query: string): boolean {
  const text = [item.label, item.description, item.keywords, item.category].join(' ').toLowerCase();
  return query.toLowerCase().trim().split(/\s+/).every(term => text.includes(term));
}

export function CommandPalette({ isOpen, onClose, items, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsId = useId();
  const filtered = useMemo(() => {
    const pool = query.trim() ? items.filter(item => matches(item, query)) : items;
    return pool.slice(0, 24);
  }, [items, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  function pick(item: CommandItem) {
    onClose();
    onSelect(item);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected(value => Math.min(value + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected(value => Math.max(value - 1, 0));
    } else if (event.key === 'Enter' && filtered[selected]) {
      event.preventDefault();
      pick(filtered[selected]);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}
      title="Search the Learning Center"
      description="Find cases, RPSGT practice tasks, or Coach Bob in one step."
      testId="command-palette">
      <label className="mb-3 flex items-center gap-3 rounded-xl border border-slate-500 bg-slate-950 px-3 py-2 focus-within:border-cyan-400">
        <Search size={19} aria-hidden="true" className="text-slate-400" />
        <input
          ref={inputRef} autoComplete="off" type="search" role="combobox"
          aria-label="Search cases and learning tools" aria-controls={optionsId}
          aria-expanded="true"
          aria-activedescendant={filtered[selected] ? optionsId + '-item-' + selected : undefined}
          value={query} onChange={event => { setQuery(event.target.value); setSelected(0); }}
          onKeyDown={handleKey}
          placeholder="Search D3C, PSG report, Coach Bob…"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <kbd className="hidden rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400 sm:block">Esc</kbd>
      </label>
      <div id={optionsId} role="listbox" aria-label="Search results" className="max-h-[55dvh] space-y-1 overflow-y-auto">
        {filtered.length ? filtered.map((item, index) => (
          <button
            role="option" id={optionsId + '-item-' + index}
            aria-selected={index === selected} type="button" key={item.id}
            onMouseEnter={() => setSelected(index)}
            onClick={() => pick(item)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left outline-offset-1 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${selected === index ? 'bg-cyan-700 text-white' : 'text-slate-200 hover:bg-slate-800'}`}>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="block truncate text-xs text-slate-300">{item.description}</span>
              <span className="block text-[11px] text-slate-400">{item.category}</span>
            </span>
            <ArrowUpRight size={17} className="shrink-0" aria-hidden="true" />
          </button>
        )) : (
          <p className="rounded-lg border border-slate-700 p-5 text-center text-sm text-slate-300">
            No results. Try a case title, practice domain, or Coach Bob.
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-400">↑ ↓ choose · Enter open · Escape close · ⌘K / Ctrl+K from anywhere</p>
    </Dialog>
  );
}
