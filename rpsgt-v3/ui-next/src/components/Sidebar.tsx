import { BookOpen, Brain, ChevronLeft, ChevronRight, FileText, House, MessageCircle, NotebookTabs, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

type Section = 'dashboard' | 'practice' | 'cases' | 'coach';
interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  active: Section;
  onToggle: () => void;
  onCloseMobile: () => void;
  onCases: () => void;
  onCoach: () => void;
}

const groups = [
  { label: 'Study', entries: [
    { id: 'dashboard', label: 'Dashboard', description: 'Learning overview', href: '../index.html', icon: House },
    { id: 'practice', label: 'Practice Center', description: 'Focused board questions', href: '../practice.html', icon: Brain },
  ] },
  { label: 'Clinical review', entries: [
    { id: 'cases', label: 'Case Review Notebook', description: 'Evidence beside decisions', icon: NotebookTabs },
    { id: 'coach', label: 'Coach Bob', description: 'Contextual learning guidance', icon: MessageCircle },
  ] },
] as const;

export function Sidebar({
  collapsed, mobileOpen, active, onToggle, onCloseMobile, onCases, onCoach,
}: Props) {
  function activate(id: Section) {
    onCloseMobile();
    if (id === 'cases') onCases();
    if (id === 'coach') onCoach();
  }
  const widths = collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]';
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close navigation"
        className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" onClick={onCloseMobile} />}
      <aside
        aria-label="Primary navigation"
        className={`${mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex w-[280px]' : 'hidden'} ${widths} flex-col border-r border-slate-800 bg-slate-950 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0`}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-4">
          {(!collapsed || mobileOpen) && (
            <a href="../index.html" className="min-w-0 text-sm font-bold leading-tight text-white">
              Sleep Pathways Guild
              <span className="mt-1 block text-xs font-medium text-cyan-300">RPSGT Learning Center</span>
            </a>
          )}
          <button type="button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed} onClick={onToggle}
            className="hidden rounded-lg p-2 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-400 lg:block">
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button type="button" onClick={onCloseMobile} aria-label="Close menu"
            className="rounded-lg p-2 hover:bg-slate-800 lg:hidden"><ChevronLeft size={20}/></button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="RPSGT sections">
          {groups.map(group => (
            <div key={group.label}>
              {(!collapsed || mobileOpen) && <h2 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{group.label}</h2>}
              <div className="space-y-1">
                {group.entries.map(item => {
                  const Icon = item.icon;
                  const current = item.id === active;
                  const classes = `flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-400 ${current ? 'border-l-[3px] border-cyan-400 bg-cyan-950 text-cyan-200' : 'text-slate-200 hover:bg-slate-800'}`;
                  const label = (!collapsed || mobileOpen) ? (
                    <span className="min-w-0">
                      <span className="block">{item.label}</span>
                      <span className="block text-[11px] font-normal text-slate-400">{item.description}</span>
                    </span>
                  ) : null;
                  return 'href' in item
                    ? <a key={item.id} href={item.href} aria-current={current ? 'page' : undefined}
                        title={item.label} className={classes}>
                        <Icon size={20} aria-hidden="true" className="shrink-0" />{label}
                      </a>
                    : <button key={item.id} type="button" title={item.label}
                        aria-current={current ? 'page' : undefined}
                        onClick={() => activate(item.id as Section)} className={classes}>
                        <Icon size={20} aria-hidden="true" className="shrink-0" />{label}
                      </button>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <a href="../learning-tools.html" title="All Learning Tools"
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            <BookOpen size={20} aria-hidden="true" className="shrink-0" />
            {(!collapsed || mobileOpen) && <>All Learning Tools <ChevronRight size={15} className="ml-auto"/></>}
          </a>
          {(!collapsed || mobileOpen) && <a href="../reports.html" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"><FileText size={20}/>My Reports</a>}
        </div>
      </aside>
    </>
  );
}
