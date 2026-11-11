import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { MessageCircle, NotebookTabs, GripVertical } from 'lucide-react';
import type { CaseData, CoachAdapter } from '../model';
import { ArtifactViewer } from './ArtifactViewer';
import { CoachBobDrawer } from './CoachBobDrawer';
import { QuestionPane } from './QuestionPane';

export type NotebookTab = 'questions' | 'coach';

interface Props {
  caseData: CaseData;
  activeTab: NotebookTab;
  onTabChange: (tab: NotebookTab) => void;
  onReviewMissed: () => void;
  coachAdapter?: CoachAdapter;
}

export function CaseReviewNotebook({
  caseData, activeTab, onTabChange, onReviewMissed, coachAdapter,
}: Props) {
  const [artifactId, setArtifactId] = useState(caseData.artifacts[0]?.id ?? '');
  const [split, setSplit] = useState(56);
  const [questionId, setQuestionId] = useState<string | null>(caseData.questions[0]?.id ?? null);
  const splitRef = useRef<HTMLDivElement>(null);
  const artifact = caseData.artifacts.find(a => a.id === artifactId) ?? caseData.artifacts[0];
  const percent = (value: number) => Math.min(72, Math.max(36, Math.round(value)));
  function resizePointer(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !splitRef.current) return;
    const area = splitRef.current.getBoundingClientRect();
    setSplit(percent((event.clientX - area.left) / area.width * 100));
  }
  function resizeKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); setSplit(value => percent(value + (event.key === 'ArrowRight' ? 5 : -5)));
    }
    if (event.key === 'Home') { event.preventDefault(); setSplit(36); }
    if (event.key === 'End') { event.preventDefault(); setSplit(72); }
  }
  const vars = { '--case-split': split + '%' } as CSSProperties;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-800">Case Review Notebook · {caseData.domain}</div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{caseData.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{caseData.descriptor}</p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900">Fictional case</span>
      </div>
      <div className="case-split-layout" ref={splitRef} style={vars}>
        <div className="case-evidence-pane min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <ArtifactViewer artifacts={caseData.artifacts} activeId={artifactId} onSelect={setArtifactId}/>
        </div>
        <div role="separator" tabIndex={0} aria-label="Resize artifact and question panes"
          aria-orientation="vertical" aria-valuemin={36} aria-valuemax={72} aria-valuenow={split}
          onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={resizePointer}
          onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onKeyDown={resizeKeyboard}
          className="case-split-handle flex cursor-col-resize touch-none items-center justify-center rounded-full bg-slate-200 text-slate-500 outline-offset-1 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-600">
          <GripVertical size={18} aria-hidden="true"/>
        </div>
        <div className="case-reasoning-pane flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-white" role="tablist" aria-label="Case tools">
            <button role="tab" type="button" id="case-questions-tab"
              aria-selected={activeTab === 'questions'} aria-controls="case-questions-panel"
              onClick={() => onTabChange('questions')}
              className={`flex items-center justify-center gap-2 border-b-[3px] px-3 py-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-cyan-500 ${activeTab === 'questions' ? 'border-cyan-700 bg-cyan-50 text-cyan-900' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
              <NotebookTabs size={17} aria-hidden="true"/> Questions
            </button>
            <button role="tab" type="button" id="case-coach-tab"
              aria-selected={activeTab === 'coach'} aria-controls="case-coach-panel"
              onClick={() => onTabChange('coach')}
              className={`flex items-center justify-center gap-2 border-b-[3px] px-3 py-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-cyan-500 ${activeTab === 'coach' ? 'border-cyan-700 bg-cyan-50 text-cyan-900' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
              <MessageCircle size={17} aria-hidden="true"/> Coach Bob
            </button>
          </div>
          <div id="case-questions-panel" role="tabpanel" aria-labelledby="case-questions-tab"
            hidden={activeTab !== 'questions'} className="case-tab-panel">
            <QuestionPane caseData={caseData} onQuestionChange={setQuestionId}
              onOpenCoach={() => onTabChange('coach')} onReviewMissed={onReviewMissed} />
          </div>
          <div id="case-coach-panel" role="tabpanel" aria-labelledby="case-coach-tab"
            hidden={activeTab !== 'coach'} className="case-tab-panel">
            <CoachBobDrawer caseData={caseData} activeQuestionId={questionId}
              artifactType={artifact?.type ?? 'psg_report'} adapter={coachAdapter}/>
          </div>
        </div>
      </div>
    </div>
  );
}
