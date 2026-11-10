import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import type { CaseData } from '../model';

interface Props {
  caseData: CaseData;
  onQuestionChange: (id: string | null) => void;
  onOpenCoach: () => void;
  onReviewMissed: () => void;
}

export function QuestionPane({
  caseData, onQuestionChange, onOpenCoach, onReviewMissed,
}: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const titleRef = useRef<HTMLHeadingElement>(null);
  const question = caseData.questions[index];
  const selected = question ? answers[question.id] : undefined;
  const graded = selected !== undefined;
  const correct = graded && selected === question.correctIndex;
  const total = caseData.questions.length;
  const answered = caseData.questions.filter(item => answers[item.id] !== undefined).length;

  useEffect(() => onQuestionChange(question?.id ?? null), [question?.id, onQuestionChange]);
  function move(next: number) {
    setIndex(next);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }
  if (!question) return (
    <section className="p-6">
      <h2 className="text-lg font-bold">Questions not yet available</h2>
      <p className="text-sm text-slate-600">An audited question set has not been attached to this case.</p>
    </section>
  );

  return (
    <section className="flex h-full min-h-[360px] flex-col" aria-label="Case reasoning questions">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-bold text-cyan-900"><CircleHelp size={17}/>Concept checks</span>
          <span className="text-xs text-slate-600">Question {index + 1} of {total}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Questions answered">
          <div className="h-full rounded-full bg-cyan-700 transition-all" style={{ width: (answered / total * 100) + '%' }}/>
        </div>
        <p className="mt-2 text-xs text-slate-500">Demo questions do not update Practice Center progress.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <h2 ref={titleRef} tabIndex={-1} className="text-base font-bold leading-7 text-slate-900 outline-none">{question.prompt}</h2>
        <div className="space-y-2" role="group" aria-label="Select an answer">
          {question.choices.map((choice, choiceIndex) => {
            const chosen = graded && selected === choiceIndex;
            const isAnswer = graded && question.correctIndex === choiceIndex;
            return (
              <button type="button" key={choiceIndex} disabled={graded}
                aria-pressed={chosen}
                onClick={() => setAnswers(current => ({
                  ...current, [question.id]: current[question.id] ?? choiceIndex,
                }))}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm leading-6 outline-offset-1 focus-visible:outline-2 focus-visible:outline-cyan-500 ${isAnswer ? 'border-emerald-500 bg-emerald-50' : chosen ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-cyan-500'} disabled:cursor-default`}>
                <span className="shrink-0 font-bold text-cyan-800">{String.fromCharCode(65 + choiceIndex)}.</span>
                <span className="flex-1">{choice}</span>
                {isAnswer && <CheckCircle2 size={18} aria-label="Correct answer" className="shrink-0 text-emerald-700" />}
                {chosen && !correct && <XCircle size={18} aria-label="Selected incorrect answer" className="shrink-0 text-amber-700" />}
              </button>
            );
          })}
        </div>
        {graded && (
          <div role="status" aria-live="polite"
            className={`rounded-xl border p-4 text-sm leading-6 ${correct ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
            <p className="font-bold">{correct ? 'Correct · verified concept' : 'Review this reasoning step'}</p>
            <p className="mt-2">{question.explanation}</p>
            <p className="mt-2 text-xs">{question.evidenceNote}</p>
            <button type="button" onClick={onOpenCoach}
              className="mt-3 rounded-lg border border-current px-3 py-2 text-xs font-semibold hover:bg-white/60">
              Discuss the concept with Coach Bob
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white p-4">
        <button type="button" disabled={index === 0}
          onClick={() => move(index - 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40">
          <ArrowLeft size={16} aria-hidden="true"/>Previous
        </button>
        {index === total - 1 && graded
          ? <button type="button" onClick={onReviewMissed}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
              Review missed questions <ArrowRight size={16} aria-hidden="true"/>
            </button>
          : <button type="button" disabled={!graded} onClick={() => move(index + 1)}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-40">
              Next question <ArrowRight size={16} aria-hidden="true"/>
            </button>}
      </div>
    </section>
  );
}
