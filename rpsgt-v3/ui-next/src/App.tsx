import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Command, Menu, Search, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { COMMANDS, DEMO_CASES } from './data';
import type { CaseData, CoachAdapter, CommandItem } from './model';
import { Breadcrumbs, type BreadcrumbItem } from './components/Breadcrumbs';
import { CaseReviewNotebook, type NotebookTab } from './components/CaseReviewNotebook';
import { CommandPalette } from './components/CommandPalette';
import { Sidebar } from './components/Sidebar';
import MissedReviewModal from './components/MissedReviewModal';
import { readMissedQuestionsCount } from './reviewCount';

function caseIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('case');
  return DEMO_CASES.some(item => item.id === id) ? id : null;
}
function navigateCase(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('case', id);
  else url.searchParams.delete('case');
  window.history.pushState({ caseId: id }, '', url);
}
function readCollapsed(): boolean {
  try { return window.localStorage.getItem('spg_rpsgt_case_sidebar_collapsed') === 'yes'; }
  catch { return false; }
}

export interface AppProps {
  /** Pass a verified, authorized coach service adapter when one exists. */
  coachAdapter?: CoachAdapter;
  cases?: readonly CaseData[];
}

export default function App({ coachAdapter, cases = DEMO_CASES }: AppProps) {
  const [caseId, setCaseId] = useState<string | null>(caseIdFromUrl);
  const [activeTab, setActiveTab] = useState<NotebookTab>('questions');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [missedCount, setMissedCount] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentCase = useMemo(() => cases.find(item => item.id === caseId) ?? null, [cases, caseId]);

  const openCase = useCallback((id: string) => {
    if (!cases.some(item => item.id === id)) return;
    navigateCase(id);
    setCaseId(id);
    setActiveTab('questions');
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [cases]);
  const showOverview = useCallback(() => {
    navigateCase(null);
    setCaseId(null);
    setActiveTab('questions');
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const openCoach = useCallback(() => {
    if (!currentCase && cases[0]) {
      openCase(cases[0].id);
    }
    setActiveTab('coach');
    setMobileOpen(false);
  }, [currentCase, cases, openCase]);
  const showMissed = useCallback(() => {
    setMissedCount(readMissedQuestionsCount());
    setReviewOpen(true);
  }, []);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setPaletteOpen(open => !open);
      }
    }
    function onPopState() { setCaseId(caseIdFromUrl()); setActiveTab('questions'); }
    window.addEventListener('keydown', shortcut);
    window.addEventListener('popstate', onPopState);
    return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('popstate', onPopState); };
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed(current => {
      const next = !current;
      try { window.localStorage.setItem('spg_rpsgt_case_sidebar_collapsed', next ? 'yes' : 'no'); } catch { /* optional UI preference */ }
      return next;
    });
  }
  function navigateCommand(item: CommandItem) {
    if (item.action.type === 'href') window.location.assign(new URL(item.action.href, document.baseURI).href);
    else if (item.action.type === 'case') {
      if (item.action.caseId) openCase(item.action.caseId);
      else showOverview();
    } else openCoach();
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '../index.html' },
    { label: 'Case Review', ...(currentCase ? { onClick: showOverview } : {}) },
    ...(currentCase ? [{ label: currentCase.category }, { label: currentCase.title }] : []),
  ];
  const active = currentCase && activeTab === 'coach' ? 'coach' : 'cases';
  const commands = useMemo(() => [
    ...COMMANDS,
    ...cases.filter(c => !DEMO_CASES.some(d => d.id === c.id)).map(c => ({
      id: c.id, label: c.title, description: c.category, keywords: c.title + ' ' + c.domain,
      category: 'Case studies' as const,
      action: { type: 'case' as const, caseId: c.id },
    })),
  ], [cases]);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:flex">
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} active={active}
        onToggle={toggleSidebar} onCloseMobile={() => setMobileOpen(false)}
        onCases={showOverview} onCoach={openCoach}/>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              type="button" aria-label="Open navigation" aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}><Menu size={21}/></button>
            <a href="../index.html" className="hidden text-sm font-bold text-slate-900 sm:block">
              Sleep Pathways Guild <span className="text-cyan-800">/ RPSGT V3</span>
            </a>
            <span className="truncate text-sm font-semibold text-slate-900 sm:hidden">Case Review</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPaletteOpen(true)}
              aria-label="Search cases and tools"
              className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-cyan-400 hover:bg-white">
              <Search size={17} aria-hidden="true"/>
              <span className="hidden sm:inline">Search cases, tasks, Coach Bob</span>
              <kbd className="ml-3 hidden rounded border border-slate-300 px-1.5 text-[11px] text-slate-500 md:inline">⌘K / Ctrl+K</kbd>
            </button>
            <button type="button" onClick={showMissed}
              className="hidden rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 sm:inline">
              Missed Review
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1800px] px-3 pb-16 pt-4 sm:px-6">
          <Breadcrumbs items={breadcrumbs} showReturn={Boolean(currentCase)} onReturn={showOverview}/>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs text-cyan-950">
            <span className="flex items-center gap-2"><ShieldCheck size={17} aria-hidden="true"/>
              Educational case review: fictional artifacts, original concept checks, no diagnostic interpretation or score writes.</span>
            <button type="button" className="font-semibold underline underline-offset-2 sm:hidden" onClick={showMissed}>
              Missed Review
            </button>
          </div>
          {currentCase ? (
            <CaseReviewNotebook key={currentCase.id} caseData={currentCase}
              activeTab={activeTab} onTabChange={setActiveTab}
              onReviewMissed={showMissed} coachAdapter={coachAdapter}/>
          ) : (
            <section aria-labelledby="case-overview-title">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-800"><BookOpen size={17}/> Case Review Notebook</div>
                <h1 id="case-overview-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">Choose a clinical teaching case</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Review a fictional teaching artifact alongside original concept questions and Coach Bob guidance.
                  Only available, validated case assets are shown; other artifact types are not simulated.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {cases.map(item => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-800">{item.category} · {item.domain}</p>
                    <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{item.descriptor}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      {item.artifacts.length} {item.artifacts.length === 1 ? 'artifact' : 'artifacts'} available · {item.questions.length} concept {item.questions.length === 1 ? 'check' : 'checks'}
                    </p>
                    <button type="button" onClick={() => openCase(item.id)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-cyan-600">
                      Open Case <ArrowRight size={17} aria-hidden="true"/>
                    </button>
                  </article>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <AlertCircle size={18} className="text-amber-700"/>
                <p className="flex-1 text-sm text-slate-600">Looking for HSAT, actigraphy, histograms, or CPAP logs? These viewers are supported by the type system but need approved teaching assets before being enabled.</p>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-50" onClick={() => setPaletteOpen(true)}>
                  <Command size={16}/>Browse learning tools
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)}
        items={commands} onSelect={navigateCommand}/>
      <MissedReviewModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)}
        missedQuestionsCount={missedCount}
        onStartReviewSession={() => window.location.assign(new URL('../review.html?list=missed', document.baseURI).href)}/>
    </div>
  );
}
