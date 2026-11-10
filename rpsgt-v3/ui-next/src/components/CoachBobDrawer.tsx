import { useState, type FormEvent } from 'react';
import { MessageCircle, Send, ShieldCheck, Sparkles } from 'lucide-react';
import type { CaseData, CoachAdapter, CoachMessage, ArtifactType } from '../model';

interface Props {
  caseData: CaseData;
  activeQuestionId: string | null;
  artifactType: ArtifactType;
  adapter?: CoachAdapter;
}

export function CoachBobDrawer({ caseData, activeQuestionId, artifactType, adapter }: Props) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  function showGuidance(title: string, advice: string) {
    setMessages(prev => [...prev,
      { id: crypto.randomUUID(), sender: 'learner', text: title },
      { id: crypto.randomUUID(), sender: 'coach', text: advice },
    ]);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!adapter || !prompt || busy) return;
    setDraft('');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'learner', text: prompt }]);
    setBusy(true);
    try {
      const response = await adapter({
        caseId: caseData.id,
        questionId: activeQuestionId,
        artifactType,
        message: prompt,
      });
      setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'coach', text: response }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'coach',
        text: 'The connected coaching service is unavailable. You can continue with the verified learning prompts below.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Coach Bob guidance" className="flex h-full min-h-[360px] flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-cyan-50 p-4">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Sparkles aria-hidden="true" className="text-cyan-700" size={20}/>Coach Bob
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {adapter
            ? 'Connected coaching guidance. Verify any scoring advice against the official source.'
            : 'Local, curated teaching guidance · Live AI chat is not connected.'}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-cyan-100 bg-white p-4 text-sm text-slate-700">
            <p className="font-bold text-cyan-900">Which reasoning step should we check?</p>
            <p className="mt-1">Select a topic below to open verified teaching guidance for this case.</p>
          </div>
        )}
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.sender === 'learner' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-3 text-sm leading-6 ${message.sender === 'learner' ? 'bg-cyan-800 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
              {message.text}
            </p>
          </div>
        ))}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><ShieldCheck size={15}/>Verified guide prompts</h3>
          {caseData.coachPrompts.map(prompt => (
            <button key={prompt.title} type="button" onClick={() => showGuidance(prompt.title, prompt.advice)}
              className="block w-full rounded-lg border border-cyan-200 bg-white p-3 text-left text-sm font-semibold text-cyan-900 hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-cyan-500">
              <MessageCircle size={16} aria-hidden="true" className="mr-2 inline"/>{prompt.title}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 bg-white p-3">
        <label className="sr-only" htmlFor="coach-message">Ask Coach Bob about the case</label>
        <input id="coach-message" value={draft} maxLength={1000}
          disabled={!adapter || busy} onChange={event => setDraft(event.target.value)}
          placeholder={adapter ? 'Ask about this case…' : 'Live chat requires a connected coaching service'}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-offset-1 focus-visible:outline-2 focus-visible:outline-cyan-500 disabled:bg-slate-100" />
        <button type="submit" disabled={!adapter || busy || !draft.trim()}
          aria-label="Send message to Coach Bob"
          className="rounded-lg bg-cyan-800 px-3 text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40">
          <Send size={17} aria-hidden="true"/>
        </button>
      </form>
    </section>
  );
}
