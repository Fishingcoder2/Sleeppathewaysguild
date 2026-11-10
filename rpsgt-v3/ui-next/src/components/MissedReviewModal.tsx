import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Dialog } from './Dialog';

interface MissedReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  missedQuestionsCount: number | null;
  onStartReviewSession: () => void;
}

/**
 * A navigation handoff, not a second grading engine.
 * Count refers to missedIds, never flaggedIds.
 */
export default function MissedReviewModal({
  isOpen, onClose, missedQuestionsCount, onStartReviewSession,
}: MissedReviewModalProps) {
  const count = missedQuestionsCount == null ? null : Math.max(0, Math.floor(missedQuestionsCount));
  const hasMisses = count === null || count > 0;
  return (
    <Dialog isOpen={isOpen} onClose={onClose}
      title="Review missed questions"
      description="Revisit questions answered incorrectly in your Practice Center sessions."
      testId="missed-review-modal">
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
        {count === 0
          ? <CheckCircle2 aria-hidden="true" className="shrink-0 text-emerald-400" />
          : <AlertCircle aria-hidden="true" className="shrink-0 text-amber-400" />}
        <p className="text-sm leading-6 text-slate-200" aria-live="polite">
          {count === null ? 'Open your saved missed-question list.'
            : count === 0 ? 'Your missed-question list is currently clear.'
            : <>You have <strong className="text-amber-300">{count} missed {count === 1 ? 'question' : 'questions'}</strong> to revisit.</>}
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        Review the original question, compare your answer with the explanation, and practice the underlying concept again.
        This does not reset your existing progress.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" data-testid="modal-dismiss-btn" onClick={onClose}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-400">
          Review later
        </button>
        <button type="button" data-testid="modal-start-review-btn"
          disabled={!hasMisses}
          onClick={() => { onClose(); onStartReviewSession(); }}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          {hasMisses ? 'Start missed review' : 'No missed questions'}
          <ArrowRight aria-hidden="true" size={16}/>
        </button>
      </div>
    </Dialog>
  );
}
