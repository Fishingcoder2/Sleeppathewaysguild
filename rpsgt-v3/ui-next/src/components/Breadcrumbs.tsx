import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  items: readonly BreadcrumbItem[];
  showReturn?: boolean;
  onReturn?: () => void;
}

export function Breadcrumbs({ items, showReturn, onReturn }: Props) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="overflow-x-auto py-2">
        <ol className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600 sm:text-sm">
          {items.map((item, index) => (
            <li className="flex items-center gap-1.5" key={index}>
              {index > 0 && <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-slate-400" />}
              {item.href ? <a className="rounded font-medium hover:text-cyan-800 focus-visible:outline-2" href={item.href}>{item.label}</a>
                : item.onClick ? <button type="button" className="rounded font-medium hover:text-cyan-800 focus-visible:outline-2" onClick={item.onClick}>{item.label}</button>
                : <span aria-current="page" className="font-semibold text-slate-900">{item.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      {showReturn && onReturn && (
        <div className="sticky top-[64px] z-20 mb-4 flex justify-start">
          <button type="button" onClick={onReturn}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-cyan-900 shadow-md backdrop-blur hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-cyan-500 sm:text-sm">
            <ArrowLeft size={17} aria-hidden="true" /> Return to Case Overview
          </button>
        </div>
      )}
    </>
  );
}
